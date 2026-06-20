# Flux — 会議議事録アプリ 🎙️

音声録音 → 文字起こし → 議事録自動生成までをワンストップで実現するモバイルアプリ。

## 📱 アプリ構成

| レイヤー | 技術スタック |
|---------|------------|
| フロントエンド | Expo (SDK 56) + React Native 0.85 + React 19.2 |
| ルーティング | Expo Router |
| バックエンド | Next.js 16 (Vercel) |
| 認証 | Supabase Auth（Passkey対応） |
| ストレージ | Cloudflare R2（音声ファイル） |
| 文字起こし | Groq Whisper |
| 決済 | RevenueCat + Stripe |

## 📁 ディレクトリ構成

```
meeting-minutes-app/
├── app/                    # Expo Router 画面
│   ├── (auth)/             # 認証系（login）
│   ├── (tabs)/             # メインタブ（20画面）
│   ├── minute/             # 議事録詳細
│   └── record/             # 録音画面
├── src/                    # 共通モジュール
│   ├── components/         # 共通UIコンポーネント
│   ├── hooks/              # カスタムフック
│   ├── lib/                # ユーティリティ
│   ├── services/           # データサービス
│   ├── types/              # 型定義
│   └── __tests__/          # テスト
├── apps/
│   └── flux-api/           # Vercel API（Next.js App Router）
│       ├── app/api/        # APIエンドポイント
│       ├── lib/            # APIライブラリ
│       └── __tests__/      # APIテスト
└── .github/
    └── workflows/          # CI設定
```

## 🚀 開発

```bash
# インストール
npm install --legacy-peer-deps

# 開発サーバー起動
npm start

# テスト
npm test                              # ルートテスト（727 tests）
cd apps/flux-api && npm test          # APIテスト（48 tests）

# TypeScriptチェック
npx tsc --noEmit

# 型チェックのみのテスト
npx tsc --noEmit && npm test
```

## 🧪 テスト状況

- **ルート**: 44 files / 727 tests ✅
- **flux-api**: 6 files / 48 tests ✅
- **TypeScript**: 0 errors ✅

## 🔄 CI/CD

GitHub Actions で以下のジョブが自動実行されます：
- TypeScript Check
- Expo Export
- Test（ルート + flux-api）

## 📦 依存関係の自動更新

Dependabot が毎週月曜日にパッケージ更新のPRを作成します。
更新はグループ化され、レビューが容易になっています。
