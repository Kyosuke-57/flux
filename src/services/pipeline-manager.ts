import { supabase } from "../lib/supabase";
import { uploadToR2 } from "./r2-upload";
import {
  startTranscription,
  subscribeToTranscription,
} from "./transcription";
import type { TranscriptionProgress } from "./transcription";
import type { RealtimePostgresUpdatePayload } from "@supabase/supabase-js";
import type { TranscriptionJob } from "../types";

type TranscriptionJobRow = TranscriptionJob & {
  minute_id?: string;
  progress_detail?: string;
};

// ─── pipelineManager シングルトン ────────────────────────────

/**
 * パイプラインの状態
 */
export type PipelineManagerState =
  | "idle"
  | "uploading"
  | "transcribing"
  | "completed"
  | "failed";

/**
 * パイプラインマネージャー
 *
 * 音声ファイルのアップロード → 文字起こし依頼 → 進捗監視 を一括管理するシングルトン。
 * minute/[id].tsx の編集画面から直接呼び出される。
 */
export const pipelineManager = {
  _status: "idle" as PipelineManagerState,
  _uploadProgress: 0,
  _transcriptionProgress: null as TranscriptionProgress | null,
  _errorMessage: null as string | null,
  _minuteId: null as string | null,
  _unsubscribe: null as (() => void) | null,
  _listeners: [] as Array<() => void>,

  get status() {
    return this._status;
  },
  get uploadProgress() {
    return this._uploadProgress;
  },
  get transcriptionProgress() {
    return this._transcriptionProgress;
  },
  get errorMessage() {
    return this._errorMessage;
  },
  get minuteId() {
    return this._minuteId;
  },

  /** 状態変更リスナーを登録（usePipeline フックから利用） */
  addListener(fn: () => void) {
    this._listeners.push(fn);
    return () => {
      this._listeners = this._listeners.filter((l) => l !== fn);
    };
  },

  _notify() {
    this._listeners.forEach((fn) => fn());
  },

  _setStatus(s: PipelineManagerState) {
    this._status = s;
    this._notify();
  },

  /**
   * パイプラインを開始する
   *
   * @param uri             音声ファイルのローカルURI
   * @param templateContent テンプレート内容（任意）
   */
  async startPipeline(uri: string, templateContent?: string) {
    try {
      this._setStatus("uploading");
      this._uploadProgress = 0;
      this._errorMessage = null;
      this._transcriptionProgress = null;
      this._minuteId = null;

      const fileName = `recording_${Date.now()}.m4a`;
      const mimeType = "audio/mp4";

      // ファイルサイズを取得
      let fileSize = 0;
      try {
        const { File } = await import("expo-file-system");
        const file = new File(uri);
        fileSize = file.info().size ?? 0;
      } catch {
        // 取得できない場合は続行
      }

      // アップロード
      const { r2Key } = await uploadToR2(
        { uri, filename: fileName, mimeType, fileSize },
        (progress) => {
          this._uploadProgress = progress;
          this._notify();
        },
      );

      if (!r2Key) {
        throw new Error(
          "アップロードに失敗しました（R2キーが返されませんでした）",
        );
      }

      // 文字起こし開始
      this._setStatus("transcribing");
      this._uploadProgress = 100;

      const recordingId = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 11)}`;

      const jobId = await startTranscription({
        r2Key,
        recordingId,
        fileSize,
        fileName,
        templateContent,
      });

      // Realtime で進捗を購読
      this._unsubscribe = subscribeToTranscription(
        jobId,
        (p) => {
          this._transcriptionProgress = p;
          if (p.minuteId) {
            this._minuteId = p.minuteId;
          }
          if (p.status === "completed") {
            this._setStatus("completed");
            this._cleanup();
          } else if (p.status === "failed") {
            this._setStatus("failed");
            this._errorMessage = p.errorMessage ?? "文字起こしに失敗しました";
            this._cleanup();
          }
          this._notify();
        },
        (err) => {
          this._errorMessage = err;
          this._setStatus("failed");
          this._cleanup();
        },
      );
    } catch (err: unknown) {
      this._errorMessage =
        err instanceof Error ? err.message : "パイプライン処理中にエラーが発生しました";
      this._setStatus("failed");
      throw err;
    }
  },

  /** パイプラインをリセット */
  reset() {
    this._cleanup();
    this._status = "idle";
    this._uploadProgress = 0;
    this._transcriptionProgress = null;
    this._errorMessage = null;
    this._minuteId = null;
    this._notify();
  },

  _cleanup() {
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
  },
};

// ─── Realtime 購読 ────────────────────────────────────────────

/**
 * Supabase Realtime でパイプライン進捗を購読する
 *
 * transcription_jobs テーブルの変更を監視し、
 * minuteId に紐づくジョブのステータスに応じてコールバックを呼び出す。
 *
 * @param minuteId  監視対象の議事録ID
 * @param callbacks 進捗・完了・エラー時のコールバック
 * @returns 購読解除用の関数
 */
export function subscribeToPipeline(
  minuteId: string,
  callbacks: {
    onProgress: (p: TranscriptionProgress) => void;
    onComplete: () => void;
    onError: (e: Error) => void;
  },
): () => void {
  const channel = supabase
    .channel(`pipeline-${minuteId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "transcription_jobs",
        filter: `minute_id=eq.${minuteId}`,
      },
      (payload: RealtimePostgresUpdatePayload<TranscriptionJobRow>) => {
        const record = payload.new as TranscriptionJobRow;

        const progress: TranscriptionProgress = {
          status: record.status,
          completedChunks: record.completed_chunks,
          totalChunks: record.total_chunks,
          progress: `${record.completed_chunks}/${record.total_chunks}`,
          progressDetail: record.progress_detail || undefined,
          minuteId: record.minute_id || undefined,
          transcript: record.transcript || undefined,
          errorMessage: record.error_message || undefined,
        };

        if (record.status === "completed") {
          callbacks.onProgress(progress);
          callbacks.onComplete();
          channel.unsubscribe();
        } else if (record.status === "failed") {
          callbacks.onProgress(progress);
          callbacks.onError(
            new Error(record.error_message ?? "文字起こしに失敗しました"),
          );
          channel.unsubscribe();
        } else {
          callbacks.onProgress(progress);
        }
      },
    )
    .subscribe((status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        callbacks.onError(new Error(`Realtime 接続エラー: ${status}`));
      }
    });

  return () => {
    channel.unsubscribe();
  };
}
