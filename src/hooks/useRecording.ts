/**
 * useRecording — 録音状態管理カスタムフック
 *
 * 録音の開始・停止・一時停止・再開と、
 * 録音完了後の R2 アップロード・文字起こし依頼をラップ。
 */
import { useState, useCallback } from "react";
import {
  startRecording as startRec,
  stopRecording as stopRec,
  pauseRecording as pauseRec,
  resumeRecording as resumeRec,
  getDuration,
} from "../services/recording";
import { uploadToR2 } from "../services/r2-upload";
import { startTranscription, subscribeToTranscription } from "../services/transcription";
import type { TranscriptionProgress } from "../services/transcription";
import type { RecordingState } from "../services/recording";

export type PipelineState = "idle" | "recording" | "paused" | "uploading" | "transcribing" | "completed" | "error";

export function useRecording() {
  const [recState, setRecState] = useState<RecordingState>("idle");
  const [pipelineState, setPipelineState] = useState<PipelineState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [progress, setProgress] = useState<TranscriptionProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);

  const handleRecord = useCallback(async () => {
    try {
      await startRec();
      setRecState("recording");
      setPipelineState("recording");
      setError(null);
      setElapsed(0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "録音の開始に失敗しました");
    }
  }, []);

  const handlePause = useCallback(async () => {
    try {
      await pauseRec();
      setRecState("paused");
      setPipelineState("paused");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "一時停止に失敗しました");
    }
  }, []);

  const handleResume = useCallback(async () => {
    try {
      await resumeRec();
      setRecState("recording");
      setPipelineState("recording");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "再開に失敗しました");
    }
  }, []);

  const handleStop = useCallback(async () => {
    let uri: string;
    let durationMs: number;
    let fileName: string;
    let mimeType: string;
    let fileSize: number;

    try {
      const result = await stopRec();
      uri = result.uri;
      durationMs = result.durationMs;
      setRecordingUri(uri);
      setRecState("idle");

      // ファイル情報を取得
      fileName = `recording_${Date.now()}.m4a`;
      mimeType = "audio/mp4";
      fileSize = await getFileSize(uri);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "録音の停止に失敗しました");
      setPipelineState("idle");
      return;
    }

    // ---- アップロード & 文字起こし ----
    try {
      setPipelineState("uploading");

      const { r2Key } = await uploadToR2({
        uri,
        filename: fileName,
        mimeType,
        fileSize,
      });

      setPipelineState("transcribing");

      const recordingId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

      const jobId = await startTranscription({
        r2Key,
        recordingId,
        fileSize,
        fileName,
      });

      // Realtime で進捗を購読
      const unsubscribe = subscribeToTranscription(
        jobId,
        (p) => {
          setProgress(p);
          if (p.status === "completed") {
            setPipelineState("completed");
          } else if (p.status === "failed") {
            setPipelineState("error");
            setError(p.errorMessage ?? "文字起こしに失敗しました");
          }
        },
        (err) => {
          setError(err);
          setPipelineState("error");
        },
      );

      // cleanup 用に返す
      return { jobId, unsubscribe };
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "アップロードまたは文字起こしに失敗しました");
      setPipelineState("error");
    }
  }, []);

  const reset = useCallback(() => {
    setRecState("idle");
    setPipelineState("idle");
    setElapsed(0);
    setProgress(null);
    setError(null);
    setRecordingUri(null);
  }, []);

  return {
    recState,
    pipelineState,
    elapsed,
    progress,
    error,
    recordingUri,
    setElapsed,
    handleRecord,
    handlePause,
    handleResume,
    handleStop,
    reset,
  };
}

/** ファイルのサイズを取得 */
async function getFileSize(uri: string): Promise<number> {
  try {
    const { File } = await import("expo-file-system");
    const file = new File(uri);
    return file.info().size ?? 0;
  } catch {
    return 0;
  }
}
