/**
 * Expo → R2 アップロードサービス（署名付きURL方式）
 *
 * 1. API サーバーに署名付きアップロードURLを要求（POST /api/flux-upload-url）
 * 2. 発行されたURLを使ってR2に直接アップロード（PUT）
 * 3. アップロード完了 → r2Key を返す
 *
 * Vercel / Cloudflare Tunnel どちらでも動作。
 * 大容量ファイルもストリーミング不要で安全。
 */
import { supabase } from "../lib/supabase";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_OTOROKU_API_URL ?? "http://localhost:3000";

export interface UploadResult {
  r2Key: string;
}

/**
 * R2 に音声ファイルをアップロード（署名付きURL方式）
 *
 * 1. API から署名付きアップロードURLを取得
 * 2. そのURLにファイルを直接 PUT
 *
 * @param onProgress 0-100 の進捗率を受け取るコールバック
 */
export async function uploadToR2(
  params: {
    uri: string;
    filename: string;
    mimeType: string;
    fileSize: number;
  },
  onProgress?: (progress: number) => void,
): Promise<UploadResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    throw new Error("認証されていません。ログインしてください。");
  }

  // 1. 署名付きアップロードURLを要求
  const urlRes = await fetch(`${API_BASE_URL}/api/flux-upload-url`, {
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

  // 2. 署名付きURLにファイルを直接PUT
  const result = await new Promise<UploadResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (e: ProgressEvent) => {
      if (onProgress && e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        onProgress(pct);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve({ r2Key });
      } else {
        const body = xhr.responseText || "(レスポンス読み取り不可)";
        reject(new Error(`R2 アップロードに失敗しました: ${xhr.status} — ${body}`));
      }
    };

    xhr.onerror = () => reject(new Error("ネットワークエラーが発生しました"));
    xhr.ontimeout = () => reject(new Error("アップロードがタイムアウトしました"));

    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", params.mimeType);
    xhr.send({ uri: params.uri, type: params.mimeType, name: params.filename });
  });

  return result;
}
