import { useState, useRef, useEffect, useCallback } from "react";
import { Alert } from "react-native";
import {
  startRecording,
  stopRecording,
  pauseRecording,
  resumeRecording,
} from "../../../src/services/recording";
import { saveRecordingLocally } from "../../../src/services/local-audio";
import { useHaptics } from "../../../src/animations";
import type { RecordingState } from "../../../src/services/recording-types";
import type { PipelineState } from "../../../src/hooks/usePipeline";

export function useRecordingState() {
  const haptics = useHaptics();

  // ── 録音状態 ──
  const [recState, setRecState] = useState<RecordingState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [sourceFileName, setSourceFileName] = useState<string | null>(null);
  const [localRecordingPath, setLocalRecordingPath] = useState<string | null>(null);

  // ── テンプレート関連 ──
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  // ── Ref ──
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── 経過時間タイマー ──
  useEffect(() => {
    if (recState === "recording") {
      startTimeRef.current = Date.now() - elapsed * 1000;
      timerRef.current = setInterval(() => {
        const seconds = Math.floor(
          (Date.now() - startTimeRef.current) / 1000,
        );
        setElapsed(seconds);
      }, 250);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [recState]);

  // アンマウント時クリーンアップ
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ── 録音操作 ──
  const handleRecord = async () => {
    if (recState !== "idle") return;
    haptics.heavyTap();
    try {
      await startRecording();
      setElapsed(0);
      setRecState("recording");
    } catch (err: unknown) {
      haptics.errorNotification();
      Alert.alert("録音できません", err instanceof Error ? err.message : "録音の開始に失敗しました。");
    }
  };

  const handlePause = async () => {
    haptics.lightTap();
    try {
      await pauseRecording();
      setRecState("paused");
    } catch (err: unknown) {
      Alert.alert("エラー", err instanceof Error ? err.message : "録音の一時停止に失敗しました");
    }
  };

  const handleResume = async () => {
    haptics.lightTap();
    try {
      await resumeRecording();
      setRecState("recording");
    } catch (err: unknown) {
      Alert.alert("エラー", err instanceof Error ? err.message : "録音の再開に失敗しました");
    }
  };

  const handleStop = async () => {
    haptics.mediumTap();
    try {
      const result = await stopRecording();
      setRecState("idle");
      setElapsed(0);
      setSourceFileName(null);
      const localPath = await saveRecordingLocally(
        result.uri,
        `rec_${Date.now()}`,
      );
      setLocalRecordingPath(localPath);
    } catch (err: unknown) {
      haptics.errorNotification();
      Alert.alert("エラー", err instanceof Error ? err.message : "録音の停止に失敗しました");
    }
  };

  // ── ユーティリティ ──
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const getTitle = (pipelineStatus: PipelineState) => {
    if (recState === "recording") return "録音中...";
    if (recState === "paused") return "一時停止中";
    switch (pipelineStatus) {
      case "idle":
        return "新規録音";
      case "uploading":
        return "アップロード中";
      case "transcribing":
        return "文字起こし中...";
      case "completed":
        return "完了";
      case "failed":
        return "エラー";
    }
  };

  return {
    recState,
    setRecState,
    elapsed,
    setElapsed,
    sourceFileName,
    setSourceFileName,
    localRecordingPath,
    setLocalRecordingPath,
    showTemplatePicker,
    setShowTemplatePicker,
    handleRecord,
    handlePause,
    handleResume,
    handleStop,
    formatTime,
    getTitle,
  };
}
