# Flux — AI開発エージェント向けガイド

このプロジェクトは Expo (SDK 56) + React Native + Next.js (Vercel) の構成です。
コードを書く前に必ずこのガイドと公式ドキュメントを参照してください。

## 必須ルール

1. **Expo HAS CHANGED** — 公式ドキュメントを必ず参照
   - https://docs.expo.dev/versions/v56.0.0/

2. **テストは必ず確認** — 変更後は以下を実行：
   - ルート: `npm test`（vitest run）
   - flux-api: `cd apps/flux-api && npm test`
   - TypeScript: `npx tsc --noEmit`

3. **依存インストールは `--legacy-peer-deps` 必須**
   - `npm install --legacy-peer-deps`
   - ExpoとReact Nativeのバージョン固定によりpeer依存の競合が発生するため

## プロジェクト構造

- `app/` — Expo Router 画面（`(tabs)` に20画面）
- `src/` — 共通モジュール（hooks, components, services, lib）
- `apps/flux-api/` — Next.js 16 API（Vercelデプロイ）
  - `app/api/` — 3エンドポイント（flux-transcribe, flux-status, flux-upload-url）
  - `lib/` — ライブラリ（supabase, groq, r2, api-auth, ffmpeg, split-audio）
  - `__tests__/` — テスト48件

## テスト注意点

- ルートの `vitest.config.ts` は `apps/flux-api/**` を除外している
- flux-apiテストは `apps/flux-api/` ディレクトリで直接実行
- テストファイルは `@/` alias を使用（vitest.config.ts の resolve.alias で設定）

## 重要なパッケージ

- Expo SDK 56（expo ~56）
- React 19.2.7
- React Native 0.85.3
- Next.js 16
- @supabase/supabase-js ^2.108.2
- @stripe/stripe-react-native（config plugin に空 props 必須: `["@stripe/stripe-react-native", {}]`）
- vitest 4.1.9
- TypeScript ~6.0.3

## 過去の改善提案

`.hermes/past_suggestions.md` を参照
