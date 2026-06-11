/**
 * Expo → R2 アップロードサービス
 *
 * 1. otoroku-api から署名付きURLを取得
 * 2. 音声ファイルを R2 に直接 PUT
 */
import { supabase } from "../lib/supabase";

// 開発中はローカル、本番は otoroku-api のデプロイ先URL
const API_BASE_URL =
  process.env.EXPO_PUBLIC_OTOROKU_API_URL ?? "http://localhost:3000";

export interface UploadResult {
  r2Key: string;
}

/**
 * R2 署名付きURLを取得 → 音声ファイルをアップロード
 */
export async function uploadToR2(params: {
  uri: string;
  filename: string;
  mimeType: string;
  fileSize: number;
}): Promise<UploadResult> {
  // 1. JWT を取得
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    throw new Error("認証されていません。ログインしてください。");
  }

  // 2. 署名付きURLをリクエスト
  const urlRes = await fetch(`${API_BASE_URL}/api/otoroku-upload-url`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filename: params.filename,
      mimeType: params.mimeType,
      fileSize: params.fileSize,
    }),
  });

  if (!urlRes.ok) {
    const err = await urlRes.text().catch(() => "");
    throw new Error(`アップロードURLの取得に失敗しました: ${urlRes.status} ${err}`);
  }

  const { uploadUrl, r2Key } = await urlRes.json();
  if (!uploadUrl || !r2Key) {
    throw new Error("アップロードURLのレスポンスが不正です");
  }

  // 3. R2 に直接アップロード
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": params.mimeType,
    },
    body: await fetch(params.uri).then((r) => r.blob()),
  });

  if (!uploadRes.ok) {
    throw new Error(`R2 アップロードに失敗しました: ${uploadRes.status}`);
  }

  return { r2Key };
}
