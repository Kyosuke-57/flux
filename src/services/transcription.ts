/**
 * 文字起こしサービス（otoroku-api + Supabase Realtime）
 *
 * 1. otoroku-api に文字起こしを依頼（POST /api/otoroku-transcribe）
 * 2. Supabase Realtime で進捗を受信（transcription_jobs テーブルの変更）
 * 3. 完了 or フォールバック時にステータス確認
 */
import { supabase } from "../lib/supabase";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

// 開発中はローカル、本番は otoroku-api のデプロイ先URL
const API_BASE_URL =
  process.env.EXPO_PUBLIC_OTOROKU_API_URL ?? "http://localhost:3000";

export type JobStatus = "queued" | "processing" | "completed" | "failed";

export interface TranscriptionProgress {
  status: JobStatus;
  completedChunks: number;
  totalChunks: number;
  progress: string; // "3/18"
  transcript?: string;
  errorMessage?: string;
}

export type ProgressCallback = (progress: TranscriptionProgress) => void;

/**
 * 文字起こしを開始する
 *
 * @returns jobId — 進捗監視に使用
 */
export async function startTranscription(params: {
  r2Key: string;
  recordingId: string;
  fileSize: number;
  fileName: string;
}): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    throw new Error("認証されていません。ログインしてください。");
  }

  const res = await fetch(`${API_BASE_URL}/api/otoroku-transcribe`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      r2Key: params.r2Key,
      recordingId: params.recordingId,
      fileSize: params.fileSize,
      fileName: params.fileName,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`文字起こし依頼に失敗しました: ${res.status} ${err}`);
  }

  const { jobId } = await res.json();
  return jobId;
}

/**
 * 文字起こしジョブの進捗を Supabase Realtime で購読する
 *
 * @returns unsubscribe 関数
 */
export function subscribeToTranscription(
  jobId: string,
  onProgress: ProgressCallback,
  onError?: (error: string) => void,
): () => void {
  const channel = supabase
    .channel(`transcription-job-${jobId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "transcription_jobs",
        filter: `id=eq.${jobId}`,
      },
      (payload: RealtimePostgresChangesPayload<any>) => {
        const record = payload.new;
        const progress: TranscriptionProgress = {
          status: record.status,
          completedChunks: record.completed_chunks,
          totalChunks: record.total_chunks,
          progress: `${record.completed_chunks}/${record.total_chunks}`,
          transcript: record.transcript || undefined,
          errorMessage: record.error_message || undefined,
        };
        onProgress(progress);

        // 完了 or 失敗時は自動的に購読解除
        if (record.status === "completed" || record.status === "failed") {
          channel.unsubscribe();
        }
      },
    )
    .subscribe((status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        onError?.(`Realtime 接続エラー: ${status}`);
      }
    });

  return () => {
    channel.unsubscribe();
  };
}

/**
 * フォールバック: ポーリングでジョブのステータスを確認
 */
export async function pollTranscriptionStatus(
  jobId: string,
): Promise<TranscriptionProgress> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(
    `${API_BASE_URL}/api/otoroku-status?jobId=${encodeURIComponent(jobId)}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  );

  if (!res.ok) {
    throw new Error(`ステータス取得に失敗しました: ${res.status}`);
  }

  return await res.json();
}
