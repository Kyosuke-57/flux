# OTOROKU App Store / Google Play 公開手順書

> 最終更新: 2026-06-06
> 対象: OTOROKU（音録）— Expo/React Native 会議録管理アプリ

---

## 📖 目次

1. [公開までの全体像](#1-公開までの全体像)
2. [かかる費用まとめ](#2-かかる費用まとめ)
3. [Step 1: アカウント登録](#3-step-1-アカウント登録)
4. [Step 2: APIキー設定](#4-step-2-apiキー設定)
5. [Step 3: EAS Build でバイナリ生成](#5-step-3-eas-build-でバイナリ生成)
6. [Step 4: Vercel デプロイ（otoroku-api）](#6-step-4-vercel-デプロイotoroku-api)
7. [Step 5: ストア提出準備](#7-step-5-ストア提出準備)
8. [Step 6: ストア提出](#8-step-6-ストア提出)
9. [コスト節約のコツ](#9-コスト節約のコツ)
10. [よくある質問](#10-よくある質問)

---

## 1. 公開までの全体像

```
アカウント準備 ──→ APIキー設定 ──→ バイナリ生成 ──→ ストア提出
  Apple $99/年       R2 / Groq         EAS Build        App Store
  Google $25/回      Vercel                             Google Play
```

**所要期間目安:** 初回は準備含めて **1〜2週間**
- アカウント登録: 即日〜3日
- バイナリ生成: 30分
- ストア審査: 1〜3日（App Store）, 数時間（Google Play）

---

## 2. かかる費用まとめ

### 絶対に必要な費用

| 項目 | 金額 | 支払いタイミング |
|------|------|----------------|
| **Apple Developer Program** | **$99/年**（約¥15,000） | App Store公開前に必須 |
| **Google Play Developer** | **$25（一括）**（約¥3,800） | Google Play公開前に必須 |
| **合計（初年度）** | **約$124（約¥19,000）** | |

### 状況によって必要な費用

| 項目 | 金額 | 必要になるケース |
|------|------|----------------|
| Supabase Pro | $25/月 | 無料枠（500MB）を超えたら |
| Vercel Pro | $20/月 | 無料枠を超えたら |
| Cloudflare R2 | ほぼ無料 | 10GBまで無料。超えても$0.015/GB/月 |
| Groq API | 無料〜$5/月 | 現在無料枠あり |
| EAS Build | 無料枠あり | 月30分のビルド時間まで無料 |

### 開発中は無料で済む内訳

```mermaid
Expo Go（実機テスト）       → 無料
Supabase Free Tier          → 無料（500MB DB）
Vercel Hobby                → 無料
Cloudflare R2 無料枠        → 無料（10GB）
Groq Whisper 無料枠          → 無料（今のところ）
```

**つまり、公開するまでは基本ゼロ円で開発できる！**

---

## 3. Step 1: アカウント登録

### Apple Developer Program（$99/年）

**登録手順:**

1. Apple ID を作成（持ってなければ）
2. [developer.apple.com/programs](https://developer.apple.com/programs) にアクセス
3. 「Enroll」→ 個人or法人を選択
4. 支払い情報入力（クレジットカード）
5. 承認待ち（数時間〜2日）

**登録後に確認すること:**
- Team ID（Apple Developer → Membership → Team ID）
- App ID 作成（Certificates, Identifiers & Profiles → Identifiers）

### Google Play Developer（$25 一括）

**登録手順:**

1. Googleアカウントで [play.google.com/console](https://play.google.com/console) にアクセス
2. 「アプリ作成」→ 登録料 $25 を支払い
3. デベロッパー登録完了

---

## 4. Step 2: APIキー設定

otoroku-api を動かすのに必要なキー一覧。すべて無料枠あり。

| サービス | 登録URL | 必要なもの | 無料枠 |
|---------|---------|-----------|-------|
| **Cloudflare R2** | [dash.cloudflare.com](https://dash.cloudflare.com) | クレカ登録 | 10GBまで無料 |
| **Groq** | [console.groq.com/keys](https://console.groq.com/keys) | メール登録 | 現状無料 |
| **OpenCode Go** | opencode.ai | メール登録 | ある程度無料 |

### 設定手順

**① Cloudflare R2 の設定:**

```bash
1. Cloudflare ダッシュボード → R2
2. Create Bucket → 名前: otoroku-audio（東京リージョン推奨）
3. Manage R2 API Tokens → Create API Token
   - 権限: Object Read & Write
   - Bucket: otoroku-audio のみ
4. 表示された Account ID, Access Key, Secret Key を保存
```

**② 環境変数を otoroku-api に設定（Vercel デプロイ後）:**

```bash
# Vercel ダッシュボード → Project Settings → Environment Variables で追加
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=otoroku-audio
GROQ_API_KEY=gsk_your_groq_key
OPENCODE_GO_API_KEY=oc_your_key
NEXT_PUBLIC_SUPABASE_URL=https://noagjjelimffuxsinvph.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...（.envからコピー）
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...（.envからコピー）
```

---

## 5. Step 3: EAS Build でバイナリ生成

### 事前準備

```bash
# EAS CLI にログイン
npx eas login

# プロジェクト初期化（初回のみ）
npx eas init
```

### Android 本番ビルド

```bash
# APK の場合
npx eas build --platform android --profile preview

# AAB（Google Play用）の場合
npx eas build --platform android --profile production
```

ビルドが完了すると、EAS ダッシュボードから `.aab` ファイルをダウンロードできる。

### iOS 本番ビルド

```bash
# Mac をお持ちの場合（Xcode 必要）
npx eas build --platform ios --profile production

# クラウドビルド（Mac 不要。EAS のサーバーでビルド）
npx eas build --platform ios --profile production --non-interactive
```

**注意:** iOS ビルドには Apple Developer Program 加入 + App ID 作成が必要。

---

## 6. Step 4: Vercel デプロイ（otoroku-api）

```bash
cd apps/otoroku-api

# Vercel CLI をインストール
npm i -g vercel

# デプロイ（対話式）
npx vercel --prod

# 表示される Project Name: otoroku-api など適当に
```

**デプロイ後:**

1. Vercel Dashboard → Project → Settings → Environment Variables
2. 上記の環境変数をすべて追加
3. Redeploy → デプロイ成功を確認

---

## 7. Step 5: ストア提出準備

### 必要なものリスト

| 項目 | 説明 | 準備時期 |
|------|------|---------|
| ✅ アプリアイコン | 1024×1024（violet soundwave + play-button） | 済み |
| ⬜ スクリーンショット | 各画面のスクリーンショット（6.5"/5.5" iPhone, 7"/10" Android） | リリース前 |
| ⬜ アプリの説明文 | 英語 + 日本語 | リリース前 |
| ⬜ プライバシーポリシー | Webページで公開 + アプリ内リンク | リリース前 |
| ⬜ 利用規約 | サブスクリプションある場合は必須 | リリース前 |
| ⬜ サポート連絡先 | メールアドレスなど | リリース前 |

### プライバシーポリシー（ひな形）

```markdown
# プライバシーポリシー

OTOROKU（音録）（以下「本アプリ」）は、ユーザーのプライバシーを尊重します。

## 収集する情報
- 録音データ（文字起こし処理のため保存）
- アカウント情報（メールアドレス、Googleアカウント情報）
- アプリ使用状況データ

## データの取り扱い
- 録音データは暗号化され、Cloudflare R2 に保存されます
- 文字起こしには Groq Whisper API を使用します
- データはユーザーの同意なく第三者と共有されません
```

これを GitHub Pages や Zenn などで公開しておく。

---

## 8. Step 6: ストア提出

### Google Play Console

1. [play.google.com/console](https://play.google.com/console) にアクセス
2. 「アプリを作成」→ 名前: OTOROKU, プラットフォーム: 電話/タブレット
3. ストア掲載情報を入力（スクショ、説明文、カテゴリなど）
4. 「アプリのコンテンツ」→ アンケートに回答
5. 「本番トラック」→ EAS Build で生成した AAB をアップロード
6. 審査提出

### App Store Connect

1. [appstoreconnect.apple.com](https://appstoreconnect.apple.com) にアクセス
2. 「マイアプリ」→ 「+」→ 新規 iOS App
3. 名前: OTOROKU, Bundle ID: com.otoroku.app
4. スクリーンショット、説明文を入力
5. EAS Submit で IPA を提出

```bash
# EAS Submit（Android）
npx eas submit --platform android --profile production

# EAS Submit（iOS）
npx eas submit --platform ios --profile production
```

---

## 9. コスト節約のコツ

### 開発中（公開前）は無料でやる方法

| やりたいこと | 無料の方法 |
|------------|-----------|
| 実機テスト | Expo Go（ビルド不要、USB or Tailscaleで接続） |
| Android テスト | Expo Go でそのまま動く |
| iOS テスト | Expo Go でそのまま動く（実機必要） |
| 文字起こしテスト | ローカルのotoroku-api + Groq（無料枠） |
| DB/ストレージ | Supabase 無料枠（500MB）で十分 |
| API サーバー | Vercel Hobby（無料、ただし15秒タイムアウト） |

### リリース後のコスト最適化

1. **Apple Developer $99/年** → これは避けられない。iOS出すなら必須
2. **Google Play $25** → 一括。Android出すなら必須
3. **Supabase Free** → まず無料枠で始めて、足りなくなったらProにアップグレード
4. **Vercel Hobby** → 同様。無料枠で十分なことが多い
5. **R2 / Groq** → 無料枠が充実。超えても微額

### 最悪のケースの月額試算

**ユーザー100人が月10回の録音をする場合:**

| 項目 | 金額 |
|------|------|
| Supabase Pro | $25 |
| Vercel Pro | $20 |
| Groq Whisper（1000回・10分録音） | ~$100 |
| R2 ストレージ | ~$5 |
| **合計** | **~$150/月** |

→ これはサブスクリプション課金（月額$5〜$10）で十分カバーできる範囲。

---

## 10. よくある質問

### Q: ストア公開って難しくない？
**A:** EAS Build + EAS Submit を使えば、コマンド数個でいけます。一番大変なのは Apple Developer の証明書周りだけど、EASが自動でやってくれます。

### Q: 審査に落ちたらどうする？
**A:** メールで理由が届くので修正して再提出。主な理由:
- プライバシーポリシーがない（対策済み）
- クラッシュする（EAS Build前に確認）
- 最低限の機能がない（機能不足なら指摘）

### Q: Android だけ先に出せる？
**A:** もちろん！Google Playは審査が早い（数時間〜1日）ので、Android先行リリースもおすすめ。

### Q: Apple Developer $99、今払わないといけない？
**A:** 公開準備が整うまで待ってOK。Expo Go で開発中は不要。最初に払うのは「あ、そろそろ出せそう」ってなったタイミングで。
