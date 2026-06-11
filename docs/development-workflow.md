# OTOROKU 開発ワークフロー

> 作成: 2026-06-06

---

## 1. Git運用ルール

### ブランチ戦略

```
main      ← リリースブランチ（安定版）
  └─ feat/xxx   ← 機能追加
  └─ fix/xxx    ← バグ修正
  └─ refactor/  ← リファクタリング
  └─ docs/      ← ドキュメント
  └─ ci/        ← CI設定変更
```

**ルール:**
- `main` に直接 push しない
- 必ず feature branch → PR → merge の流れ
- PRは **Squash merge** で1コミットにまとめる

### コミットメッセージ

```
feat: 新機能の追加
fix: バグ修正
refactor: リファクタリング
docs: ドキュメント
ci: CI関連
chore: 雑務（依存関係更新など）
```

例:
```
feat: 録音画面に波形表示を追加
fix: GoogleログインのリダイレクトURLが正しくない不具合を修正
```

---

## 2. 開発サイクル

### ステップ1: ブランチ作成

```bash
git checkout main
git pull origin main
git checkout -b feat/your-feature-name
```

### ステップ2: 実装

```bash
# Expo 開発サーバー起動
npx expo start --host lan

# もしotoroku-apiも同時に開発する場合
cd apps/otoroku-api && npm run dev
```

### ステップ3: ビルド確認

```bash
# Expo エクスポート（全バンドル確認）
npx expo export

# otoroku-api ビルド確認
cd apps/otoroku-api && npx next build
```

### ステップ4: コミット

```bash
git add <変更ファイル>
git commit -m "feat: 変更内容"
```

### ステップ5: PR作成

```bash
# push
git push -u origin HEAD

# PR作成（gh CLI）
gh pr create \
  --title "feat: 変更内容" \
  --body "## 概要\n\n変更内容の説明" \
  --label "enhancement"
```

### ステップ6: merge

```bash
# CIが通ったら squash merge
gh pr merge --squash --delete-branch
```

---

## 3. otoroku-api 開発時の注意

### ローカル開発

```bash
cd apps/otoroku-api

# 環境変数を設定（.env.local）
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
GROQ_API_KEY=xxx

# 開発サーバー起動
npm run dev
```

### デプロイ（Vercel）

```bash
cd apps/otoroku-api

# 初回デプロイ
npx vercel --prod

# 環境変数は Vercel ダッシュボードで設定
```

---

## 4. ストア提出フロー

### フェーズ0: アカウント準備

| アカウント | 費用 | 準備時期 |
|-----------|------|---------|
| Apple Developer Program | $99/年 | リリース2週間前 |
| Google Play Developer | $25（一括） | リリース1週間前 |
| Expo EAS Build | 無料枠あり | 開発中でもOK |

### フェーズ1: EAS Build でバイナリ生成

```bash
# 初回のみ EAS プロジェクト設定
npx eas init
npx eas build:configure

# 開発用ビルド（Expo Go の代わり）
npx eas build --platform android --profile development

# 本番用 Android AAB
npx eas build --platform android --profile production

# 本番用 iOS IPA（クラウドビルドOK）
npx eas build --platform ios --profile production
```

### フェーズ2: ストア提出

```bash
# Android は EAS Submit で Google Play に提出
npx eas submit --platform android --profile production

# iOS は App Store Connect に提出
npx eas submit --platform ios --profile production
```

### フェーズ3: ストア審査

| ストア | 審査期間 | 備考 |
|--------|---------|------|
| App Store | 1〜3日 | 初回は長め。日本語対応必要 |
| Google Play | 数時間〜1日 | 比較的早い |

---

## 5. ツール一覧

| ツール | 用途 | インストール |
|--------|------|------------|
| Node.js 22+ | ランタイム | 済み |
| Expo CLI | React Native開発 | `npx expo` |
| EAS CLI | ビルド・提出 | `npx eas` |
| gh CLI | GitHub操作 | 済み |
| Supabase CLI | DBマイグレーション | 済み |

---

## 6. コスト最適化のコツ

### 開発中は無料で済ます方法

| 項目 | 無料の方法 |
|------|-----------|
| 開発テスト | Expo Go（実機で即確認。無料） |
| Android テスト | ビルドしなくてもExpo GoでOK |
| iOS テスト | Expo GoでOK（ただし実機要） |
| Supabase | 無料枠（500MB DB, 1GB Storage） |
| 文字起こし | Groq Whisper（現状無料枠あり） |
| otoroku-api | Vercel Hobby（無料枠） |
| Cloudflare R2 | 無料枠（10GB Storage, 月100万リクエスト） |

### リリース後にかかる費用

| 項目 | 月額目安 |
|------|---------|
| Apple Developer Program | $8.25/月（年一括$99） |
| Supabase Pro（必要なら） | $25/月 |
| Vercel Pro（必要なら） | $20/月 |
| Groq Whisper API | 使用量次第（無料枠あり） |

---

## 7. ディレクトリ構成

```
meeting-minutes-app/
├── app/                    # Expo Router ページ
│   ├── (auth)/             # 認証関連
│   ├── (tabs)/             # タブ画面
│   ├── minute/[id].tsx     # 議事録詳細
│   └── record.tsx          # 録音画面
├── apps/
│   └── otoroku-api/        # Next.js API（文字起こしパイプライン）
├── src/
│   ├── components/         # UIコンポーネント
│   ├── contexts/           # React Context
│   ├── hooks/              # カスタムフック
│   ├── lib/                # Supabaseクライアント
│   ├── services/           # ビジネスロジック
│   ├── theme/              # デザインシステム
│   └── types/              # 型定義
├── supabase/
│   └── migrations/         # DBマイグレーション
└── docs/                   # 設計書・手順書
```

---

## 8. 困ったときは

| 問題 | 解決方法 |
|------|---------|
| Expo Go で繋がらない | Tailscale 確認 / `npx expo start --tunnel` |
| Supabase エラー | `npx supabase migration list` で同期確認 |
| ビルドが通らない | `npx expo export` / `npx tsc --noEmit` |
| ストア審査でリジェクト | ガイドラインを確認。プライバシーポリシー必須 |
