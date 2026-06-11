/**
 * RecordScreen — 録音 → R2 アップロード → 文字起こし → 完了
 *
 * Supabase Realtime で進捗を受信し、逐次表示する。
 */
import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  startRecording,
  stopRecording,
  pauseRecording,
  resumeRecording,
  importAudio,
} from "../src/services/recording";
import { getDuration } from "../src/services/recording";
import { uploadToR2 } from "../src/services/r2-upload";
import {
  startTranscription,
  subscribeToTranscription,
} from "../src/services/transcription";
import type { RecordingState } from "../src/services/recording";
import type { TranscriptionProgress } from "../src/services/transcription";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PipelineState = "idle" | "recording" | "paused" | "uploading" | "transcribing" | "completed" | "error";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RecordScreen() {
  const [recState, setRecState] = useState<RecordingState>("idle");
  const [pipelineState, setPipelineState] = useState<PipelineState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [progress, setProgress] = useState<TranscriptionProgress | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Placeholder
  const [isOfflineMode] = useState(false);

  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // -----------------------------------------------------------------------
  // Pulsing animation for recording
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (recState === "recording") {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.82,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [recState, pulseAnim]);

  // -----------------------------------------------------------------------
  // Timer
  // -----------------------------------------------------------------------
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      unsubscribeRef.current?.();
    };
  }, []);

  // -----------------------------------------------------------------------
  // Pipeline
  // -----------------------------------------------------------------------

  const runPipeline = async (uri: string) => {
    try {
      setPipelineState("uploading");
      setErrorMsg(null);

      const durationMs = await getDuration(uri);
      const fileName = `recording_${Date.now()}.m4a`;
      const mimeType = "audio/mp4";
      const fileSize = await getFileSizeExpo(uri);

      // 1. R2 にアップロード
      const { r2Key } = await uploadToR2({
        uri,
        filename: fileName,
        mimeType,
        fileSize,
      });

      // 2. 文字起こし依頼
      setPipelineState("transcribing");
      const recordingId = crypto.randomUUID?.() ?? `${Date.now()}`;
      const jobId = await startTranscription({
        r2Key,
        recordingId,
        fileSize,
        fileName,
      });

      // 3. Realtime で進捗購読
      const unsub = subscribeToTranscription(
        jobId,
        (p) => {
          setProgress(p);
          if (p.status === "completed") {
            setPipelineState("completed");
            unsubscribeRef.current = null;
          } else if (p.status === "failed") {
            setPipelineState("error");
            setErrorMsg(p.errorMessage ?? "文字起こしに失敗しました");
            unsubscribeRef.current = null;
          }
        },
        (err) => {
          setErrorMsg(err);
          setPipelineState("error");
        },
      );
      unsubscribeRef.current = unsub;
    } catch (err: any) {
      setErrorMsg(err?.message ?? "処理中にエラーが発生しました");
      setPipelineState("error");
    }
  };

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const handleRecord = async () => {
    if (recState !== "idle") return;
    try {
      await startRecording();
      setElapsed(0);
      setRecState("recording");
      setPipelineState("recording");
      setErrorMsg(null);
    } catch (err: any) {
      Alert.alert("録音できません", err?.message ?? "録音の開始に失敗しました。");
    }
  };

  const handlePause = async () => {
    try {
      await pauseRecording();
      setRecState("paused");
      setPipelineState("paused");
    } catch (err: any) {
      Alert.alert("エラー", err?.message ?? "録音の一時停止に失敗しました");
    }
  };

  const handleResume = async () => {
    try {
      await resumeRecording();
      setRecState("recording");
      setPipelineState("recording");
    } catch (err: any) {
      Alert.alert("エラー", err?.message ?? "録音の再開に失敗しました");
    }
  };

  const handleStop = async () => {
    try {
      const result = await stopRecording();
      setRecState("idle");
      setElapsed(0);

      // パイプライン実行
      await runPipeline(result.uri);
    } catch (err: any) {
      Alert.alert("エラー", err?.message ?? "録音の停止に失敗しました");
    }
  };

  const handleImport = async () => {
    try {
      const result = await importAudio();
      if (!result) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) {
        Alert.alert("エラー", "音声ファイルが選択されていません。");
        return;
      }

      Alert.alert(
        "ファイルをインポート",
        `「${asset.name ?? "ファイル"}」を文字起こししますか？`,
        [
          { text: "キャンセル", style: "cancel" },
          {
            text: "開始",
            onPress: () => {
              setPipelineState("uploading");
              runPipeline(asset.uri);
            },
          },
        ],
      );
    } catch (err: any) {
      Alert.alert("エラー", err?.message ?? "音声ファイルのインポートに失敗しました");
    }
  };

  const handleRetry = async () => {
    // エラー後のリトライ
    setPipelineState("idle");
    setProgress(null);
    setErrorMsg(null);
  };

  const handleViewResult = () => {
    // 文字起こし完了 → 議事録編集画面へ
    router.replace("/minutes");
  };

  // -----------------------------------------------------------------------
  // Progress display
  // -----------------------------------------------------------------------

  const renderProgress = () => {
    switch (pipelineState) {
      case "idle":
      case "recording":
      case "paused":
        return null;
      case "uploading":
        return (
          <View style={styles.progressContainer}>
            <Text style={styles.progressIcon}>☁️</Text>
            <Text style={styles.progressText}>アップロード中...</Text>
          </View>
        );
      case "transcribing":
        return (
          <View style={styles.progressContainer}>
            <Text style={styles.progressIcon}>📝</Text>
            <Text style={styles.progressText}>
              文字起こし中...
              {progress && ` (${progress.progress})`}
            </Text>
            {progress && (
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: progress.totalChunks > 0
                        ? `${(progress.completedChunks / progress.totalChunks) * 100}%`
                        : "0%",
                    },
                  ]}
                />
              </View>
            )}
          </View>
        );
      case "completed":
        return (
          <View style={styles.progressContainer}>
            <Text style={styles.progressIcon}>✅</Text>
            <Text style={styles.progressText}>文字起こし完了！</Text>
            <TouchableOpacity style={styles.actionButton} onPress={handleViewResult}>
              <Text style={styles.actionButtonText}>結果を見る</Text>
            </TouchableOpacity>
          </View>
        );
      case "error":
        return (
          <View style={styles.progressContainer}>
            <Text style={styles.progressIcon}>⚠️</Text>
            <Text style={styles.progressText}>文字起こしに失敗しました</Text>
            {errorMsg && (
              <Text style={styles.errorDetail}>{errorMsg}</Text>
            )}
            <View style={styles.errorActions}>
              <TouchableOpacity
                style={styles.errorButton}
                onPress={handleRetry}
              >
                <Text style={styles.errorButtonText}>リトライ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.errorButton, styles.errorButtonSecondary]}
                onPress={() => {
                  setPipelineState("idle");
                  setErrorMsg(null);
                }}
              >
                <Text style={[styles.errorButtonText, styles.errorButtonTextSecondary]}>
                  後で試す
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
    }
  };

  // -----------------------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------------------

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const disabled = isOfflineMode || pipelineState === "uploading" || pipelineState === "transcribing";

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancel}>キャンセル</Text>
        </TouchableOpacity>
        <Text style={styles.title}>
          {pipelineState === "idle" || pipelineState === "uploading"
            ? "新規録音"
            : pipelineState === "recording"
              ? "録音中..."
              : pipelineState === "paused"
                ? "一時停止中"
                : pipelineState === "transcribing"
                  ? "文字起こし中..."
                  : pipelineState === "completed"
                    ? "完了"
                    : "エラー"}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Main area */}
      <View style={styles.content}>
        {pipelineState !== "idle" && pipelineState !== "uploading" && pipelineState !== "transcribing" && (
          <Text style={styles.timer}>{formatTime(elapsed)}</Text>
        )}

        {(pipelineState === "uploading" || pipelineState === "transcribing") && (
          <Text style={styles.timer}>{formatTime(elapsed)}</Text>
        )}

        {pipelineState === "idle" && (
          <View style={styles.idleContent}>
            <TouchableOpacity
              style={[styles.bigRecordOuter, disabled && styles.disabled]}
              onPress={handleRecord}
              disabled={disabled}
              activeOpacity={0.75}
            >
              <View style={styles.bigRecordInner}>
                <View style={styles.recordDot} />
              </View>
            </TouchableOpacity>
            <Text style={styles.tapToRecord}>タップして録音</Text>

            <TouchableOpacity
              style={[styles.importButton, disabled && styles.disabled]}
              onPress={handleImport}
              disabled={disabled}
              activeOpacity={0.7}
            >
              <Text style={styles.importIcon}>📂</Text>
              <Text style={styles.importText}>音声ファイルをインポート</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Recording / Paused indicator */}
        {(recState === "recording" || recState === "paused") && (
          <Animated.View
            style={[
              styles.recordingIndicator,
              recState === "recording" && { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <View style={styles.recordingDot} />
          </Animated.View>
        )}

        {/* Pipeline progress */}
        {renderProgress()}
      </View>

      {/* Bottom controls (recording/paused only) */}
      {(recState === "recording" || recState === "paused") && (
        <View style={styles.controls}>
          {recState === "recording" ? (
            <TouchableOpacity style={styles.controlButton} onPress={handlePause}>
              <View style={styles.pauseIcon} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.controlButton} onPress={handleResume}>
              <View style={styles.resumeIcon} />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.stopButton} onPress={handleStop}>
            <View style={styles.stopIcon} />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getFileSizeExpo(uri: string): Promise<number> {
  try {
    const FS = await import("expo-file-system");
    const info = await FS.default.getInfoAsync(uri);
    return "size" in info ? (info.size ?? 0) : 0;
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  cancel: {
    fontSize: 16,
    color: "#ef4444",
    fontWeight: "500",
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    color: "#ffffff",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  idleContent: {
    alignItems: "center",
    gap: 16,
  },
  bigRecordOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  bigRecordInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#dc2626",
    justifyContent: "center",
    alignItems: "center",
  },
  recordDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ffffff",
  },
  tapToRecord: {
    fontSize: 15,
    color: "#a1a1aa",
    fontWeight: "500",
    marginTop: 4,
  },
  importButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1e1e1e",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333333",
    borderStyle: "dashed",
    marginTop: 24,
  },
  importIcon: {
    fontSize: 20,
  },
  importText: {
    fontSize: 15,
    color: "#a1a1aa",
    fontWeight: "500",
  },
  recordingIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  recordingDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#ef4444",
  },
  timer: {
    fontSize: 72,
    fontWeight: "200",
    color: "#ffffff",
    fontVariant: ["tabular-nums"],
    marginBottom: 16,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 48,
    gap: 40,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2a2a2a",
    justifyContent: "center",
    alignItems: "center",
  },
  pauseIcon: {
    width: 18,
    height: 18,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderColor: "#ffffff",
  },
  resumeIcon: {
    width: 0,
    height: 0,
    borderLeftWidth: 18,
    borderTopWidth: 11,
    borderBottomWidth: 11,
    borderLeftColor: "#ffffff",
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    marginLeft: 4,
  },
  stopButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
  },
  stopIcon: {
    width: 22,
    height: 22,
    borderRadius: 4,
    backgroundColor: "#ffffff",
  },
  disabled: {
    opacity: 0.4,
  },

  // --- Progress overlay ---
  progressContainer: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 32,
  },
  progressIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  progressText: {
    fontSize: 16,
    color: "#d4d4d8",
    fontWeight: "500",
    textAlign: "center",
  },
  progressBarBg: {
    width: "100%",
    height: 4,
    backgroundColor: "#2a2a2a",
    borderRadius: 2,
    marginTop: 8,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#22c55e",
    borderRadius: 2,
  },
  actionButton: {
    backgroundColor: "#22c55e",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 8,
  },
  actionButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  errorDetail: {
    fontSize: 13,
    color: "#a1a1aa",
    textAlign: "center",
    marginTop: 4,
  },
  errorActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  errorButton: {
    backgroundColor: "#ef4444",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  errorButtonSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#3f3f46",
  },
  errorButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  errorButtonTextSecondary: {
    color: "#a1a1aa",
  },
});
