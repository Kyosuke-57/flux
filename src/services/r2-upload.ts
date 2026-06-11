/**
 * Expo → R2 アップロードサービス（サーバープロキシ方式）
 *
 * multipart/form-data でバイナリ直接送信。Base64エンコードを避けることで
 * 大ファイルのアップロードを高速化し、Cloudflare Tunnel のタイムアウト(524)を防止。
 */
import { supabase } from "../lib/supabase";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_OTOROKU_API_URL ?? "http://localhost:3000";

export interface UploadResult {
  r2Key: string;
}

/**
 * 音声ファイルを API サーバー経由で R2 にアップロード
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

  // multipart/form-data でファイルを送信（Base64エンコード不要）
  const formData = new FormData();

  if (params.uri.startsWith("blob:") || params.uri.startsWith("data:")) {
    const response = await fetch(params.uri);
    const blob = await response.blob();
    const file = new File([blob], params.filename, { type: params.mimeType });
    formData.append("audio", file);
  } else {
    formData.append("audio", {
      uri: params.uri,
      type: params.mimeType,
      name: params.filename,
    } as any);
  }

  formData.append("filename", params.filename);

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
        try {
          const data = JSON.parse(xhr.responseText);
          if (!data.r2Key) {
            reject(new Error("R2 アップロードのレスポンスが不正です"));
            return;
          }
          onProgress?.(100);
          resolve({ r2Key: data.r2Key });
        } catch {
          reject(new Error("レスポンスの解析に失敗しました"));
        }
      } else {
        const body = xhr.responseText || "(レスポンス読み取り不可)";
        reject(new Error(`R2 アップロードに失敗しました: ${xhr.status} — ${body}`));
      }
    };

    xhr.onerror = () => reject(new Error("ネットワークエラーが発生しました"));
    xhr.ontimeout = () => reject(new Error("アップロードがタイムアウトしました"));

    xhr.open("POST", `${API_BASE_URL}/api/otoroku-upload-stream`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    // Content-Type は自動設定（multipart/form-data; boundary=...）
    xhr.send(formData as any);
  });

  return result;
}
