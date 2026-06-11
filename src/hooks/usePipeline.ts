import { useState, useCallback, useRef } from "react";
import { uploadToR2 } from "../services/r2-upload";
import {
  startTranscription,
  subscribeToTranscription,
} from "../services/transcription";
import type { TranscriptionProgress } from "../services/transcription";

export type PipelineState =
  | "idle"
  | "recording"
  | "uploading"
  | "transcribing"
  | "completed"
  | "failed";

export function usePipeline() {
  const [status, setStatus] = useState<PipelineState>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [transcriptionProgress, setTranscriptionProgress] =
    useState<TranscriptionProgress | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [minuteId, setMinuteId] = useState<string | undefined>(undefined);
  const [elapsed, setElapsed] = useState(0);

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** 経過時間タイマーを開始 */
  const startTimer = useCallback(() => {
    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 250);
  }, []);

  /** 経過時間タイマーを停止 */
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /** 購読をクリーンアップ */
  const cleanupSubscription = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
  }, []);

  /**
   * パイプラインを開始する
   *
   * 1. アップロード（進捗表示付き）
   * 2. 文字起こし依頼
   * 3. Realtime で進捗受信 → 完了または失敗
   *
   * @param uri             録音ファイルのローカルURI
   * @param templateContent テンプレート内容（任意）
   */
  const startPipeline = useCallback(
    async (uri: string, templateContent?: string) => {
      try {
        setStatus("uploading");
        setUploadProgress(0);
        setErrorMessage(null);
        setTranscriptionProgress(null);
        setMinuteId(undefined);
        startTimer();

        const fileName = `recording_${Date.now()}.m4a`;
        const mimeType = "audio/mp4";

        // ファイルサイズを取得
        let fileSize = 0;
        try {
          const { File } = await import("expo-file-system");
          const file = new File(uri);
          fileSize = file.info().size ?? 0;
        } catch {
          // サイズ取得できない場合は続行
        }

        // アップロード
        const { r2Key } = await uploadToR2(
          { uri, filename: fileName, mimeType, fileSize },
          (progress) => {
            setUploadProgress(progress);
          },
        );

        if (!r2Key) {
          throw new Error("アップロードに失敗しました（R2キーが返されませんでした）");
        }

        // 文字起こし開始
        setStatus("transcribing");
        setUploadProgress(100);

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
        const unsubscribe = subscribeToTranscription(
          jobId,
          (p) => {
            setTranscriptionProgress(p);
            if (p.minuteId) {
              setMinuteId(p.minuteId);
            }
            if (p.status === "completed") {
              setStatus("completed");
              stopTimer();
              cleanupSubscription();
            } else if (p.status === "failed") {
              setStatus("failed");
              setErrorMessage(p.errorMessage ?? "文字起こしに失敗しました");
              stopTimer();
              cleanupSubscription();
            }
          },
          (err) => {
            setErrorMessage(err);
            setStatus("failed");
            stopTimer();
            cleanupSubscription();
          },
        );

        unsubscribeRef.current = unsubscribe;
      } catch (err: any) {
        setErrorMessage(err?.message ?? "パイプライン処理中にエラーが発生しました");
        setStatus("failed");
        stopTimer();
      }
    },
    [startTimer, stopTimer, cleanupSubscription],
  );

  /** パイプラインをキャンセルしてクリーンアップ */
  const cancelPipeline = useCallback(() => {
    cleanupSubscription();
    stopTimer();
    setStatus("idle");
    setUploadProgress(0);
    setTranscriptionProgress(null);
    setErrorMessage(null);
    setMinuteId(undefined);
    setElapsed(0);
  }, [cleanupSubscription, stopTimer]);

  /** 状態をリセット（cancelPipelineと同じ） */
  const reset = useCallback(() => {
    cancelPipeline();
  }, [cancelPipeline]);

  return {
    status,
    uploadProgress,
    transcriptionProgress,
    errorMessage,
    minuteId,
    elapsed,
    startPipeline,
    cancelPipeline,
    reset,
  };
}
