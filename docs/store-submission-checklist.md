# OTOROKU App Store / Play Store 公開準備チェックリスト

> 最終更新: 2026-06-06

---

## ✅ 完了済み

| # | 項目 | 状態 |
|---|------|------|
| 1 | app.json — iOS bundleIdentifier `com.otoroku.app` | ✅ |
| 2 | app.json — Android package `com.otoroku.app` | ✅ |
| 3 | app.json — iOS `UIBackgroundModes: ["audio"]` | ✅ |
| 4 | app.json — アイコン・スプラッシュ設定済み | ✅ |
| 5 | app.json — スキーム `otoroku://` | ✅ |
| 6 | eas.json — build/submit 設定 | ✅ |
| 7 | TypeScript ビルド正常 (expo export ✅) | ✅ |
| 8 | otoroku-api Next.js ビルド正常 | ✅ |
| 9 | Supabase 接続済み (Tokyo, ref: noagjjelimffuxsinvph) | ✅ |
| 10 | Supabase マイグレーション適用済み | ✅ |
| 11 | GitHub リポジトリ (Kyosuke-57/otoroku) | ✅ |

---

## ⏳ あなたのアカウント情報が必要

### 1. 環境変数（otoroku-api）

otoroku-api は Vercel にデプロイする前に以下の環境変数を設定する必要があります：

| 変数 | 取得元 | 優先度 |
|------|--------|--------|
| `R2_ACCOUNT_ID` | Cloudflare R2 ダッシュボード | 🔴 必須 |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 → Manage API Tokens | 🔴 必須 |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2（新規発行） | 🔴 必須 |
| `R2_BUCKET_NAME` | `otoroku-audio`（要作成） | 🔴 必須 |
| `GROQ_API_KEY` | https://console.groq.com/keys | 🔴 必須 |
| `OPENCODE_GO_API_KEY` | OpenCode アカウント | 🟡 補正用（任意） |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API | 🔴 必須 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 同上 | 🔴 必須 |
| `SUPABASE_SERVICE_ROLE_KEY` | 同上（Service Role セクション） | 🔴 必須 |

### 2. Google OAuth（Supabase Auth）

Supabase の Google OAuth 設定がまだの場合は必要：
- Google Cloud Console で OAuth 同意画面を設定
- Supabase Dashboard → Authentication → Settings にリダイレクトURL追加

### 3. RevenueCat（サブスクリプション課金）

- RevenueCat プロジェクトを作成（https://app.revenuecat.com）
- `EXPO_PUBLIC_REVENUECAT_API_KEY` を .env に設定
- App Store の In-App Purchase と Google Play Billing を RevenueCat に接続

---

## 📋 公開までに必要な手順

### フェーズ A: Apple Developer アカウント
- [ ] Apple Developer Program 登録（$99/年）→ https://developer.apple.com/programs
- [ ] Team ID を取得（Apple Developer → Membership）
- [ ] App ID を作成（`com.otoroku.app`）
- [ ] Push Notification 証明書（必要なら）

### フェーズ B: Google Play Developer アカウント
- [ ] Google Play Console 登録（$25 一括）→ https://play.google.com/console
- [ ] App signing key の作成/管理

### フェーズ C: EAS Build 実行

```bash
# Expo アカウントにログイン
npx eas login

# プロジェクト設定（初回のみ）
npx eas build:configure

# Android APK (development)
npx eas build --platform android --profile development

# Android AAB (production)
npx eas build --platform android --profile production

# iOS (production — Mac必須)
npx eas build --platform ios --profile production
```

### フェーズ D: Vercel デプロイ（otoroku-api）

```bash
cd apps/otoroku-api

# Vercel CLI でデプロイ
npx vercel --prod

# 環境変数は Vercel Dashboard → Project Settings → Environment Variables で設定
```

### フェーズ E: ストア提出準備

| 項目 | 説明 |
|------|------|
| アプリアイコン | ✅ 1024×1024 済み（violet soundwave + play-button） |
| スクリーンショット | 各画面のスクリーンショットを用意（6.5"/5.5" iPhone, 7"/10" Android） |
| アプリ説明文 | 英語 + 日本語で用意 |
| プライバシーポリシー | アプリ内 + Web 公開 |
| 利用規約 | サブスクリプションがある場合は必須 |
| デモ動画 | あると良い（30秒程度） |
| コンテンツレーティング | App Store: 4+（情報）, Google Play: 要アンケート |

### フェーズ F: 申請・公開

1. App Store Connect でアプリを登録
2. Google Play Console でアプリを作成
3. EAS Submit でバイナリ提出

```bash
npx eas submit --platform ios --profile production
npx eas submit --platform android --profile production
```

---

## ⚙️ 技術的リマインダー

| 項目 | メモ |
|------|------|
| Expo SDK 54 → 最新 | SDK 54 で問題なければOK。必要なら `npx expo upgrade` |
| iOS 本番ビルド | Mac が必要（または EAS Build のクラウドビルド） |
| Android 本番ビルド | Windows でも可能 |
| Cloudflare R2 | バケット `otoroku-audio` を作成＋CORS設定必要 |
| Push通知 | 必要なら Expo Push API or FCM/APNs 設定 |
| バックグラウンド録音 | iOS: `UIBackgroundModes: ["audio"]` 設定済み ✅ |

---

## 📝 プライバシーポリシー（ひな形）

```markdown
# プライバシーポリシー

OTOROKU（音録）（以下「本アプリ」）は、ユーザーのプライバシーを尊重します。

## 収集する情報
- 録音データ（文字起こし処理のため一時的に保存）
- アカウント情報（メールアドレス、Googleアカウント情報）
- アプリ使用状況データ

## データの取り扱い
- 録音データは暗号化され、Cloudflare R2 に保存されます
- 文字起こしには Groq Whisper API を使用します
- データはユーザーの同意なく第三者と共有されません

## お問い合わせ
[あなたの連絡先]
```
