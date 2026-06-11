# OTOROKU 文字起こし・議事録生成パイプライン設計書

> 作成: 2026-06-05
> 最終更新: 2026-06-06（決定事項を反映）
> 対象: OTOROKU アプリ（Expo / React Native）

---

## 目次

1. [全体アーキテクチャ](#1-全体アーキテクチャ)
2. [利用サービスとコスト](#2-利用サービスとコスト)
3. [キューイング・リトライ戦略](#3-キューイングリトライ戦略)
4. [DBスキーマ変更案](#4-dbスキーマ変更案)
5. [ステップ別要件](#5-ステップ別要件)
6. [フロントエンド変更点](#6-フロントエンド変更点)
7. [確定した設計判断](#7-確定した設計判断)
8. [実装ロードマップ](#8-実装ロードマップ)
9. [コスト試算](#9-コスト試算)
10. [未決定・検討事項](#10-未決定検討事項)

---

## 1. 全体アーキテクチャ

### アーキテクチャ方式

**Vercel Monorepo 方式（決定: 2026-06-06）**

同一リポジトリ (`meeting-minutes-app`) 内に Expo アプリと Vercel API を同居させ、Vercel ダッシュボードで Root Directory を指定して別プロジェクトとしてデプロイする。

```
meeting-minutes-app/              ← GitHub リポジトリ
│
├── apps/otoroku-app/             ← Expo / React Native（既存）
│   ├── app/
│   ├── src/
│   └── package.json
│
├── apps/otoroku-api/             ← NEW: Vercel 別プロジェクト ✅ 実装済み
│   ├── app/api/
│   │   ├── otoroku-upload-url/   ← GET: R2署名付きURL発行 ✅
│   │   │   └── route.ts
│   │   ├── otoroku-transcribe/   ← POST: 文字起こし実行 ✅
│   │   │   └── route.ts          └ 全チャンク Groq → OpenCode Go 補正 → R2削除
│   │   └── otoroku-status/       ← GET: 進捗確認（フォールバック用） ✅
│   │       └── route.ts
│   ├── lib/                      ← mama_care から移植 ✅
│   │   ├── r2.ts                 └ R2署名URL発行 + getObject + deleteObject
│   │   ├── groq.ts               └ Groq Whisper + リトライ + OpenCode Go補正
│   │   ├── split-audio.ts        └ FFmpeg 音声分割
│   │   ├── ffmpeg.ts             └ ffmpeg-static パス取得
│   │   ├── supabase.ts           └ otoroku Supabase クライアント
│   │   └── api-auth.ts           └ JWT 検証（Authorization Bearer）
│   ├── types/index.ts            ← APIレスポンス型 ✅
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.ts
│   └── vercel.json
│
├── supabase/
│   └── migrations/
│       ├── ...（既存のマイグレーション）
│       └── 20260606000000_create_transcription_jobs.sql  ← NEW ✅
├── src/                          ← Expo アプリ用 ✅ 更新済み
│   ├── services/
│   │   ├── recording.ts          ← 既存（録音） ✅
│   │   ├── r2-upload.ts          ← NEW: Expo → R2 アップロード ✅
│   │   └── transcription.ts      ← 書き換え: otoroku-api + Realtime ✅
│   ├── hooks/
│   │   └── useRecording.ts       ← NEW: 録音〜文字起こしまで統合フック ✅
│   └── lib/supabase.ts           ← 既存（Expo Supabase クライアント）
├── app/
│   ├── record.tsx                ← 更新: パイプラインフロー統合 ✅
│   └── ...
├── docs/                         ← 設計書
└── package.json
```

**Vercel ダッシュボード設定:**
1. Add New Project → `meeting-minutes-app`
2. Root Directory: `apps/otoroku-api`
3. Framework Preset: Next.js（or Other）
4. 環境変数: R2, Groq, Supabase（otoroku用）, OpenCode Go の各キー

### なぜこの構成か

| 項目 | 判断理由 |
|------|---------|
| Vercel Monorepo（同一リポジトリ） | mama_care の voice パイプライン資産をコピーせず移植。デプロイは完全独立。コスト追加なし |
| mama_care API 経由ではない | mama_care のメンテナンスや変更に影響されない。GA後のアーキテクチャ変更リスクゼロ |
| R2 使用 | Storage egress 無料。Supabase Free の2GB制限を気にしなくていい |
| スマホ → R2 直接アップロード | 転送コスト最小。署名付きURLで安全 |
| Supabase Realtime | ポーリングよりリアルタイム性が高く、バッテリー消費が少ない |
| 処理後R2自動削除 | ストレージコスト最小化。完了/失敗時に自動削除 |

### データフロー

```
otoroku (Expo)
┌──────────────────────────────────────────────┐
│  ① 録音 (expo-av) → .m4a                    │
│                                               │
│  ② otoroku-api にアップロードURLを要求        │
│     GET /api/otoroku-upload-url               │
│     ← { uploadUrl, r2Key }                    │
│                                               │
│  ③ R2 に直接アップロード（Expo → R2）        │
│                                               │
│  ④ otoroku-api に処理を依頼                   │
│     POST /api/otoroku-transcribe              │
│     { r2Key, recordingId, fileSize }          │
│     ← { jobId: "job_xxx" }                    │
│                                               │
│  ⑤ Supabase Realtime で進捗を受信             │
│     postgres_changes を subscribe              │
│     ← { status, progress, transcript? }       │
└──────────────────────────────────────────────┘

otoroku-api (Vercel Pro — 別プロジェクト、15分タイムアウト)
┌──────────────────────────────────────────────┐
│  ⑥ キュー管理テーブルにジョブ登録             │
│     status: queued                            │
│                                               │
│  ⑦ 処理実行:                                 │
│     ├ R2 から音声ダウンロード                 │
│     ├ FFmpeg で10分チャンクに分割              │
│     ├ 各チャンクを Groq Whisper で文字起こし   │
│     │   └ 429時は Exponential Backoff リトライ │
│     ├ 全チャンク完了 → OpenCode Go で補正      │
│     ├ 完了/失敗時にR2音声ファイルを自動削除    │
│     └ 結果を otoroku の Supabase DB に保存    │
│                                               │
│  ⑧ 進捗情報を transcription_jobs テーブルに    │
│     更新（Realtime で Expo に自動通知）       │
└──────────────────────────────────────────────┘

otoroku Supabase DB
┌──────────────────────────────────────────────┐
│  transcription_jobs テーブル                   │
│  minutes テーブル（結果）                      │
│  recordings テーブル                           │
└──────────────────────────────────────────────┘
```

### 認証方式

otoroku（Expo）から otoroku-api を呼ぶ際の認証:

- **JWT 検証方式**（スマホに秘密情報を保持しない）
- otoroku でログイン → Supabase JWT を取得
- API 呼び出し時に `Authorization: Bearer *** を付与
- otoroku-api 側で otoroku Supabase の JWKS 公開鍵を使って JWT を検証

```
otoroku (Expo)                  otoroku-api (Vercel)
      │                                │
      │ ① Supabase でログイン          │
      │ ← JWT                          │
      │                                │
      │ ② POST /api/otoroku-transcribe │
      │    Authorization: Bearer ***  │
      │ ──────────────────────────────→ │
      │                                 │ ③ JWKS公開鍵でJWT検証
      │                                 │   ├ 有効 → 処理続行
      │                                 │   └ 無効 → 401
      │                                │
```

---

## 2. 利用サービスとコスト

| サービス | 用途 | プラン | 月額 |
|---------|------|--------|------|
| Vercel | mama_care API のホスティング | Pro（既存） | $20/月（既存） |
| Cloudflare R2 | 音声ファイル保存 | 無料枠（10GB） | $0 |
| Groq | 文字起こし (whisper-large-v3) | 無料枠 | $0 |
| OpenCode Go | 補正 (deepseek-v4-flash) | 無料枠 | $0 |
| Supabase | DB・認証・Realtime | Free | $0 |

**mama_care のコストは既存で発生しているため、otoroku の追加コストは実質ゼロ。**

---

## 3. キューイング・リトライ戦略

### なぜキューが必要か

- Groq の無料枠にはレートリミットがある（Whisper: 1分間に約30リクエスト）
- 複数ユーザーが同時に文字起こしを要求した場合、リミット超過の可能性
- キューイングにより順次処理し、429エラーを回避する

### キュー管理

**Vercel 側の in-memory キュー + DB永続化のハイブリッド方式:**

```typescript
class TranscriptionQueue {
  private queue: Job[] = [];
  private processing = false;

  async enqueue(job: Job): Promise<string> {
    // ジョブをDBに保存（status: queued）
    const jobId = await saveJob(job);
    this.queue.push({ ...job, id: jobId });
    this.processNext();
    return jobId;
  }

  private async processNext() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;
    const job = this.queue.shift()!;
    try {
      await this.executeJob(job);
    } catch (e) {
      await markFailed(job.id, e);
    } finally {
      this.processing = false;
      this.processNext(); // 次のジョブへ
    }
  }
}
```

ただし、Vercel Serverless Function はコールドスタート時にメモリが消えるため、**インメモリキューは永続性がない**。そこで：

**ハイブリッド方式:**
1. リクエスト受付 → `transcription_jobs` テーブルに `status: queued` で登録
2. 同一関数内で逐次処理（1リクエスト内で複数ジョブを処理）
3. タイムアウトしそうなら `status: queued` のまま返す → 次回呼び出し時に再開
4. ポーリング（最終手段）時に未処理ジョブがあれば処理を再開する

### リトライ戦略

```typescript
async function transcribeWithRetry(
  chunkPath: string,
  maxRetries: number = 5,
): Promise<string> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await groqTranscribe(chunkPath);
    } catch (e) {
      if (isRateLimitError(e)) {
        const wait = Math.min(2 ** attempt, 30); // Exponential backoff: 2, 4, 8, 16, 30秒
        await sleep(wait * 1000);
        continue;
      }
      if (isTimeoutError(e) && attempt < maxRetries) {
        await sleep(1000);
        continue;
      }
      throw e; // リトライ不能なエラー
    }
  }
  throw new Error(`文字起こし失敗（リトライ上限到達）`);
}
```

### フォールバック

Groq が長時間応答しない場合に備えて、将来的に OpenRouter Whisper（Deepgram）へのフォールバックを追加可能（Phase 3）:

```typescript
const providers = [
  { name: "groq", fn: groqTranscribe },
  { name: "openrouter", fn: openRouterTranscribe }, // 将来追加
];
```

### スケーラビリティ試算

| ユーザー数 | 同時録確率 | 必要キュースロット |
|-----------|-----------|------------------|
| 10人 | 低（会議中は操作しない） | 1〜2 |
| 50人 | 中 | 3〜5 |
| 100人 | 高 | 5〜10 |

現実的な会議アプリの利用パターンでは、キューに溜まっても数十秒〜数分待てば処理される想定。

---

## 4. DBスキーマ変更案

mama_care の Supabase ではなく、**otoroku の Supabase** にテーブルを追加する。

### transcription_jobs テーブル（新規）

```sql
create table transcription_jobs (
  id uuid primary key default gen_random_uuid(),
  recording_id uuid not null references recordings(id),
  user_id uuid not null references profiles(id),
  r2_key text not null,
  file_name text not null,
  file_size bigint not null,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'completed', 'failed')),
  total_chunks int not null default 1,
  completed_chunks int not null default 0,
  transcript text,
  error_message text,
  groq_retry_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ポーリング用インデックス
create index idx_transcription_jobs_status on transcription_jobs(status);
create index idx_transcription_jobs_recording on transcription_jobs(recording_id);

-- RLS
alter table transcription_jobs enable row level security;

create policy "Users can view own jobs"
  on transcription_jobs for select
  using (auth.uid() = user_id);

create policy "Service role can insert/update"
  on transcription_jobs for all
  using (auth.role() = 'service_role');
```

### minutes テーブル（拡張）

既存の minutes テーブルに以下のカラムを追加:

```sql
alter table minutes add column if not exists raw_transcription text;
alter table minutes add column if not exists corrected_transcription text;
alter table minutes add column if not exists pipeline_job_id uuid references transcription_jobs(id);
alter table minutes add column if not exists transcription_error text;
alter table minutes add column if not exists duration_seconds int;
```

### recordings テーブル（拡張）

```sql
alter table recordings add column if not exists r2_key text;
alter table recordings add column if not exists file_size_bytes bigint;
alter table recordings add column if not exists duration_seconds int;
```

---

## 5. ステップ別要件

### Step 1: スマホ録音（Expo）

- `expo-av` の `Audio.Recording` を使用（既存 `services/recording.ts` で実装済み）
- 録音形式: AAC (.m4a) — ファイルサイズと品質のバランスが良い
- 録音後 → R2 にアップロード（署名付きURL経由）
- **録音時間制限:** 無料ユーザーは1回10分まで、有料ユーザーは最大2時間まで

### Step 2: mama_care API — 音声前処理

**mama_care 側の新しい Route Handler:**
- `GET /api/voice/otoroku-upload-url` — R2 署名付きURLを発行
- `POST /api/voice/otoroku-transcribe` — 文字起こし実行
- `GET /api/voice/otoroku-status` — 進捗確認（Realtime フォールバック用）

**前処理（既存の mama_care 資産を流用）:**
- FFmpeg で 16kHz モノラル WAV に変換
- 無音カット（silenceremove）
- 音量正規化（dynaudnorm）
- 10分単位で分割（25MB以下を保証）

### Step 3: Groq Whisper 文字起こし

- `whisper-large-v3` モデル
- 言語: 日本語固定
- 分割されたチャンクを順次処理
- Exponential Backoff リトライ（最大5回）
- 現在は Groq のみで運用。OpenRouter フォールバックは将来追加

### Step 4: 補正

- mama_care の OpenCode Go（deepseek-v4-flash）を使用
- 誤認識の軽微な補正 + 句読点の追加
- 元の文意は変更しない

### Step 5: 議事録生成（将来フェーズ）

- テンプレートエンジン + LLM
- テンプレート変数: `{{title}}`, `{{date}}`, `{{summary}}`, `{{content}}`
- 業種別テンプレートを初期提供（汎用/医療/教育/営業/プロジェクト管理）

---

## 6. フロントエンド変更点

### 新規ページ: 録音画面

```
app/
├── record/
│   └── index.tsx          ← NEW: 録音・パイプライン進捗画面
```

### 録音画面のUIフロー:

```
1. 録音ボタン → 録音開始（既存 services/recording.ts）
   無料ユーザー: 10分制限、有料ユーザー: 2時間制限
2. 停止ボタン → 録音完了
3. R2 へアップロード（署名付きURL → fetch PUT）
4. mama_care API へ処理依頼（POST）
5. 進捗表示（Supabase Realtime subscribe）:
   ■ キュー待機中...
   ■ 文字起こし中... (3/18 チャンク)
   ✅ 完了！ → 議事録編集画面へ
```

### エラー時のUI:

```
┌─────────────────────────────┐
│ [⚠] 文字起こしに失敗しました │
│                              │
│ エラー: Groq API が応答しま │
│ せんでした。                 │
│                              │
│ ┌─────────────────────┐     │
│ │  リトライ          │     │
│ └─────────────────────┘     │
│                              │
│ ┌─────────────────────┐     │
│ │  後で試す（保存）  │     │
│ └─────────────────────┘     │
│                              │
│ ┌─────────────────────┐     │
│ │  諦めて削除        │     │
│ └─────────────────────┘     │
└─────────────────────────────┘
```

- **リトライ** → API を再度呼び出す（キューに再投入）
- **後で試す** → transcription_jobs の status = 'queued' のまま保持
- **諦めて削除** → ジョブとR2の音声を削除

### 必要な新規サービスファイル:

| ファイル | 役割 |
|---------|------|
| `src/services/r2-upload.ts` | R2 署名付きURL取得 → アップロード |
| `src/services/transcription.ts` | mama_care API 呼び出し + Realtime subscribe |
| `src/hooks/useRecording.ts` | 録音状態管理カスタムフック |
| `src/hooks/useTranscription.ts` | 文字起こし進捗管理フック（Realtime連携） |

---

## 7. 確定した設計判断

### ✅ アーキテクチャ方式: Vercel Monorepo

同一リポジトリ内に Expo アプリと Vercel API を同居。Vercel ダッシュボードで Root Directory 指定。
`mama_care` に依存せず、otoroku 単独でデプロイ・運用可能。
（2026-06-06 決定: mama_care API 経由方式から変更）

### ✅ 認証方式: JWT 検証

otoroku Supabase の JWT を otoroku-api 側で検証。スマホに秘密情報を保持しない。
（2026-06-05 決定: 共有シークレット方式から変更）

### ✅ 通知方式: Supabase Realtime

ポーリングの代わりに Supabase Realtime（postgres_changes）を使用。
otoroku-api 側で `transcription_jobs` を UPDATE → Realtime が Expo に自動通知。
Supabase ダッシュボード → Database → Replication で `transcription_jobs` テーブルを有効化すること。
（2026-06-05 決定）

### ✅ R2 自動削除

パイプライン完了時（成功/失敗とも）に、otoroku-api 側で R2 の音声ファイルを自動削除する。
（2026-06-05 決定）

### ✅ 最大録音時間

| プラン | 1回あたりの制限 |
|-------|----------------|
| 無料ユーザー | 10分 |
| 有料ユーザー | 最大2時間 |

Expo 側で RevenueCat + Stripe の課金状態を見て録音開始時に制限をかける。
（2026-06-05 決定）

### ✅ 文字起こしプロバイダ

当面は **Groq Whisper（whisper-large-v3）** のみで運用。
Groq 無料枠が終了 or 不安定になった場合に OpenRouter Whisper（Deepgram）へのフォールバックを Phase 3 で追加。
（2026-06-05 決定）

### ✅ エラー時のUX

3択を提供: リトライ / 後で試す（キュー保持）/ 諦めて削除
（2026-06-05 決定）

### ✅ 議事録テンプレート

**基本テンプレート:**
```
# {{title}}

- 日時: {{date}}
- 参加者: {{attendees}}

## 概要
{{summary}}

## 議事内容
{{content}}

## 決定事項
{{decisions}}

## アクションアイテム
| 担当 | 内容 | 期限 |
|------|------|------|
| {{assignee}} | {{task}} | {{due}} |
```

**業種別バリエーション（初期提供）:**

| 業種 | テンプレートの特徴 |
|------|------------------|
| 汎用 | 基本形 |
| 医療 | 患者ID, 診療科, 申し送り事項を追加 |
| 教育 | 授業日, 単元, 課題, 次回予告を追加 |
| 営業 | 商談先, フェーズ, 次のアクションを追加 |
| プロジェクト管理 | タスク一覧, マイルストーン, ブロッカーを追加 |

ユーザーが自由にテンプレートを編集できる UI は Phase 2 以降で実装。
（2026-06-05 決定）

---

## 8. 実装ロードマップ

### Phase 1（優先度高）— 録音→文字起こし→保存

#### otoroku-api（Vercel 別プロジェクト）
- [ ] `apps/otoroku-api/` プロジェクト作成（package.json, vercel.json, tsconfig）
- [ ] R2 署名付きURL発行 — `GET /api/otoroku-upload-url`
- [ ] 文字起こし実行 — `POST /api/otoroku-transcribe`
- [ ] 進捗確認（フォールバック用） — `GET /api/otoroku-status`
- [ ] mama_care から音声分割 + Groq Whisper パイプラインを移植（`lib/groq.ts`, `lib/split-audio.ts`, `lib/ffmpeg.ts`）
- [ ] mama_care から R2 操作を移植（`lib/r2.ts`）
- [ ] mama_care から OpenCode Go 補正を移植（`lib/opencode-go.ts`）
- [ ] JWT 検証ミドルウェア
- [ ] 処理完了/失敗時にR2音声ファイル自動削除
- [ ] キューイング + リトライ戦略の実装

#### otoroku Supabase
- [ ] `transcription_jobs` テーブル作成（マイグレーション）
- [ ] Supabase Realtime 有効化（Dashboard → Database → Replication）

#### otoroku-app（Expo）
- [ ] `src/services/r2-upload.ts` — Expo → R2 アップロード
- [ ] `src/services/transcription.ts` — otoroku-api 呼び出し + Realtime subscribe
- [ ] `app/record/index.tsx` — 録音画面 UI（録音時間制限込み）

### Phase 2（中）— UX向上・安定化

- [ ] 録音中の波形表示
- [ ] エラーハンドリングの強化（リトライ/後で試す/削除）
- [ ] 文字起こし結果の編集画面
- [ ] ユーザー向けテンプレート編集UI
- [ ] 録音時間制限の課金連携（RevenueCat + Stripe）

### Phase 3（低）— 議事録生成・テンプレート自動化

- [ ] テンプレート管理（CRUD + 初期テンプレート5種シーディング）
- [ ] LLM 議事録生成（テンプレートエンジン連携）
- [ ] OpenRouter Whisper フォールバック

---

## 9. コスト試算

| 項目 | 単価 | 100回/月あたり |
|------|------|---------------|
| Vercel Pro（既存） | $20/月 | $20（変わらず） |
| Cloudflare R2 | 無料枠 10GB | $0 |
| Groq Whisper（10分録音） | 無料 | $0 |
| OpenCode Go 補正 | 無料 | $0 |
| Supabase DB | 無料枠 | $0 |
| **otoroku 追加コスト** | | **$0/月** |

**注意:** Groq の無料枠が終了した場合、OpenRouter Whisper（Deepgram）に移行すると 100回/月 で約 $10/月 のコストが発生する。

---

## 10. 未決定・検討事項

- [ ] **ポーリング間隔** — Realtime を第一候補にしているが、フォールバック時のポーリング間隔は未定
- [ ] **ファイル形式** — 録音後のフォーマットを AAC (.m4a) に固定して良いか
- [ ] **Supabase Realtime の学習** — 初めて使うので、実装時に動作確認しながら進める
- [ ] **otoroku 側の Supabase アプリケーション設定** — Realtime 有効化・RLS設定など、本番投入前に確認
- [ ] **議事録テンプレートの具体的なテンプレート文字列** — 初期5種類のテンプレート詳細は設計段階で詰める
