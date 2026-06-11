import { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  Easing,
  Dimensions,
  BackHandler,
  Modal,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import {
  startRecording,
  stopRecording,
  pauseRecording,
  resumeRecording,
  importAudio,
  startMeteringPolling,
} from "../src/services/recording";
import { usePipeline } from "../src/hooks/usePipeline";
import { getAllTemplates } from "../src/services/templates";
import { saveRecordingLocally } from "../src/services/local-audio";
import type { RecordingState } from "../src/services/recording";
import type { Template } from "../src/types";
import { useHaptics, useBounce, useCelebration, BounceInView, FadeInView } from "../src/animations";

import { useSettings } from "../src/contexts/SettingsContext";
import type { RecordingEffect } from "../src/contexts/SettingsContext";
import { theme, BorderRadius, Shadows, Colors } from "../src/theme";
import { WaveformEffect, PulseEffect } from "../src/components/RecordingEffects";

type PipelineState = "idle" | "recording" | "paused" | "uploading" | "transcribing" | "completed" | "failed";

const TIPS = [
  "タグを活用すると議事録をテーマ別に整理できます",
  "フォルダでプロジェクトや月別に分類できます",
  "テンプレートを使えば議事録の書式を統一できます",
  "文字起こし後、補正文を編集して見やすくできます",
  "ダークモードは設定から切り替えられます",
  "録音ファイルは自動でクラウドにアップロードされます",
  "作成した議事録はテキストやMarkdownで書き出せます",
  "最近の議事録はホーム画面からすぐにアクセスできます",
  "長押しで議事録の複製や削除ができます",
  "録音品質は設定画面で変更できます",
];

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;

function RippleEffect({ color, isActive, volume = 0 }: { color: string; isActive: boolean; volume?: number }) {
  const ripples = useRef(
    Array.from({ length: 3 }, () => ({
      scale: new Animated.Value(0),
      opacity: new Animated.Value(0),
    }))
  ).current;
  const progress = useRef([0, 0.33, 0.66]); // 各リップルの位相オフセット
  const volumeRef = useRef(0);
  volumeRef.current = volume;

  useEffect(() => {
    if (!isActive) {
      ripples.forEach((r) => {
        r.scale.setValue(0);
        r.opacity.setValue(0);
      });
      progress.current = [0, 0.33, 0.66];
      return;
    }

    const timer = setInterval(() => {
      const vol = volumeRef.current;
      // 音量でリップルの進行速度を変化
      const speed = 0.012 + vol * 0.04;

      progress.current = progress.current.map((p, i) => {
        const next = p + speed * (1 + i * 0.15);
        return next > 1 ? next - 1 : next;
      });

      ripples.forEach((r, i) => {
        const p = progress.current[i];
        // scale: 0→1 を進行度に応じて
        r.scale.setValue(p);
        // opacity: 前半で立ち上がり後半でフェード
        r.opacity.setValue(p < 0.1 ? p / 0.1 * 0.4 : (1 - p) / 0.9 * 0.4 * vol);
      });
    }, 30);

    return () => clearInterval(timer);
  }, [isActive, ripples]);

  const size = Math.max(SCREEN_WIDTH, SCREEN_HEIGHT) * 1.2;

  return (
    <>
      {ripples.map((r, i) => (
        <Animated.View
          key={i}
          style={{
            position: "absolute",
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 2,
            borderColor: color,
            opacity: r.opacity,
            transform: [{ scale: r.scale }],
          }}
          pointerEvents="none"
        />
      ))}
    </>
  );
}

function AnimatedHourglass({ color, isDeterminate }: { color: string; isDeterminate: boolean }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulse, {
            toValue: 1,
            duration: 1200,
            easing: Easing.sin,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulse, {
            toValue: 0,
            duration: 1200,
            easing: Easing.sin,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const rotate = pulse.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["-8deg", "8deg", "-8deg"],
  });

  const opacity = pulse.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.7, 1, 0.7],
  });

  return (
    <Animated.View style={{ opacity, transform: [{ rotate }] }}>
      <Ionicons
        name={isDeterminate ? "document-text-outline" : "hourglass-outline"}
        size={36}
        color={color}
      />
    </Animated.View>
  );
}

function UploadingIcon({ color }: { color: string }) {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [floatAnim]);

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6],
  });

  const arrowOpacity = floatAnim.interpolate({
    inputRange: [0, 0.4, 0.6, 1],
    outputRange: [1, 0.3, 0.3, 1],
  });

  return (
    <View style={{ width: 48, height: 48, justifyContent: "center", alignItems: "center" }}>
      <Animated.View style={{ transform: [{ translateY }] }}>
        <Ionicons name="cloud-outline" size={36} color={color} />
      </Animated.View>
      <Animated.View style={{ position: "absolute", opacity: arrowOpacity, transform: [{ translateY }] }}>
        <Ionicons name="arrow-up" size={18} color={color} />
      </Animated.View>
    </View>
  );
}

export default function RecordScreen() {
  const { settings } = useSettings();
  const c = theme(settings.isDarkMode);
  const haptics = useHaptics();
  const celebration = useCelebration();
  const recordBtn = useBounce({ scaleIn: 0.93, haptic: false });

  const [recState, setRecState] = useState<RecordingState>("idle");
  const pipeline = usePipeline();
  const [elapsed, setElapsed] = useState(0);

  const [isOfflineMode] = useState(false);
  const [sourceFileName, setSourceFileName] = useState<string | null>(null);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [audioVolume, setAudioVolume] = useState(0); // 0-1 音量レベル
  const isProcessing = pipeline.status === "uploading" || pipeline.status === "transcribing";

  // Template picker
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const pendingTranscribe = useRef(false);

  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const glowAnim = useRef(new Animated.Value(0)).current;

  // 音量メータリングのポーリング
  useEffect(() => {
    if (recState !== "recording") {
      setAudioVolume(0);
      return;
    }

    const unsub = startMeteringPolling((metering: number) => {
      // 実用レンジ -50dB（無音）〜 -10dB（大声）を 0-1 にマッピング
      // -50dB 以下はノイズゲートでカット
      const clamped = Math.max(-50, Math.min(-10, metering));
      // -50 → 0, -10 → 1 に正規化
      const normalized = (clamped + 50) / 40;
      // パワーカーブで小さな音への反応を抑える（指数 1.5〜2.0）
      const volume = Math.pow(normalized, 1.8);
      setAudioVolume(volume);
    }, 80);

    return () => {
      unsub();
      setAudioVolume(0);
    };
  }, [recState]);

  useEffect(() => {
    if (recState === "recording") {
      const glow = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
      glow.start();
      return () => { glow.stop(); };
    } else {
      glowAnim.setValue(0);
    }
  }, [recState, glowAnim]);

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

  useFocusEffect(
    useCallback(() => {
      pipeline.reset();
      setSourceFileName(null);
    }, []),
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    const onBackPress = () => {
      if (recState === "recording" || recState === "paused") {
        Alert.alert(
          "録音をキャンセルしますか？",
          "録音データは破棄されます。",
          [
            { text: "続けて録音", style: "cancel" },
            { text: "キャンセルする", style: "destructive", onPress: () => router.back() },
          ],
        );
        return true;
      }
      if (isProcessing) {
        Alert.alert(
          "処理中です",
          "文字起こし処理を中断して戻りますか？",
          [
            { text: "待つ", style: "cancel" },
            { text: "中断する", style: "destructive", onPress: () => router.back() },
          ],
        );
        return true;
      }
      return false;
    };
    const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => subscription.remove();
  }, [recState, isProcessing]);

  useEffect(() => {
    if (pipeline.status !== "transcribing") return;
    const tipTimer = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % TIPS.length);
    }, 6000);
    return () => clearInterval(tipTimer);
  }, [pipeline.status]);

  useEffect(() => {
    if (pipeline.status === "completed") {
      celebration.trigger();
      if (pipeline.minuteId) {
        const timer = setTimeout(() => router.replace(`/minute/${pipeline.minuteId}`), 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [pipeline.status]);

  const handleRecord = async () => {
    if (recState !== "idle") return;
    haptics.heavyTap();
    try {
      await startRecording();
      setElapsed(0);
      setRecState("recording");
    } catch (err: any) {
      haptics.errorNotification();
      Alert.alert("録音できません", err?.message ?? "録音の開始に失敗しました。");
    }
  };

  const handlePause = async () => {
    haptics.lightTap();
    try {
      await pauseRecording();
      setRecState("paused");
    } catch (err: any) {
      Alert.alert("エラー", err?.message ?? "録音の一時停止に失敗しました");
    }
  };

  const handleResume = async () => {
    haptics.lightTap();
    try {
      await resumeRecording();
      setRecState("recording");
    } catch (err: any) {
      Alert.alert("エラー", err?.message ?? "録音の再開に失敗しました");
    }
  };

  const [localRecordingPath, setLocalRecordingPath] = useState<string | null>(null);

  const handleStop = async () => {
    haptics.mediumTap();
    try {
      const result = await stopRecording();
      setRecState("idle");
      setElapsed(0);
      setSourceFileName(null);
      const localPath = await saveRecordingLocally(result.uri, `rec_${Date.now()}`);
      setLocalRecordingPath(localPath);
    } catch (err: any) {
      haptics.errorNotification();
      Alert.alert("エラー", err?.message ?? "録音の停止に失敗しました");
    }
  };

  const handleOpenTemplatePicker = useCallback(async () => {
    if (!localRecordingPath) return;
    setTemplatesLoading(true);
    setShowTemplatePicker(true);
    try {
      const { data } = await getAllTemplates();
      const tpls = data ?? [];
      setTemplates(tpls);
      const defaultTpl = tpls.find((t) => t.is_default);
      setSelectedTemplateId(defaultTpl?.id ?? null);
    } catch {
      setTemplates([]);
      setSelectedTemplateId(null);
    } finally {
      setTemplatesLoading(false);
    }
  }, [localRecordingPath]);

  const handleStartTranscription = useCallback(async () => {
    if (!localRecordingPath) return;
    setShowTemplatePicker(false);
    const selected = selectedTemplateId
      ? templates.find((t) => t.id === selectedTemplateId)
      : null;
    pipeline.startPipeline(localRecordingPath, selected?.content);
  }, [localRecordingPath, selectedTemplateId, templates]);

  const handleSaveForLater = () => {
    if (!localRecordingPath) return;
    router.replace(`/minute/new?recordingPath=${encodeURIComponent(localRecordingPath)}` as any);
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
      const fname = asset.name ?? "ファイル";
      Alert.alert(
        "ファイルをインポート",
        `「${fname}」を文字起こししますか？`,
        [
          { text: "キャンセル", style: "cancel" },
          {
            text: "開始",
            onPress: () => { setSourceFileName(fname); pipeline.startPipeline(asset.uri); },
          },
        ],
      );
    } catch (err: any) {
      Alert.alert("エラー", err?.message ?? "音声ファイルのインポートに失敗しました");
    }
  };

  const handleRetry = () => {
    pipeline.reset();
    setSourceFileName(null);
  };

  const handleViewResult = () => {
    if (pipeline.minuteId) {
      const params = localRecordingPath ? `?recordingPath=${encodeURIComponent(localRecordingPath)}` : "";
      router.replace(`/minute/${pipeline.minuteId}${params}` as any);
    } else {
      router.replace("/minutes");
    }
  };

  const renderProgress = () => {
    const { status, uploadProgress, transcriptionProgress, errorMessage } = pipeline;

    switch (status) {
      case "idle":
        return null;
      case "uploading":
        return (
          <BounceInView key="uploading" style={styles.progressCard}>
            <UploadingIcon color={c.primary} />
            <Text style={[styles.progressText, { color: c.textPrimary }]}>
              {uploadProgress < 100 ? "アップロード中..." : "アップロード完了"}
            </Text>
            {sourceFileName && (
              <Text style={[styles.progressFileName, { color: c.textMuted }]}>{sourceFileName}</Text>
            )}
            <Text style={[styles.progressPercent, { color: c.primary }]}>{uploadProgress}%</Text>
            <View style={[styles.progressBarBg, { backgroundColor: c.border }]}>
              <View style={[styles.progressBarFill, { backgroundColor: c.primary, width: `${uploadProgress}%` }]} />
            </View>
          </BounceInView>
        );
      case "transcribing": {
        const tp = transcriptionProgress;
        const hasChunks = tp?.totalChunks != null && tp.totalChunks > 0;
        const pct = hasChunks
          ? Math.round((tp.completedChunks / tp.totalChunks) * 100)
          : 0;
        const isIndeterminate = !hasChunks || pct === 0;
        return (
          <BounceInView key="transcribing" style={styles.progressCard}>
            <AnimatedHourglass color={c.primary} isDeterminate={!isIndeterminate} />
            <Text style={[styles.progressText, { color: c.textPrimary }]}>
              {tp?.progressDetail ?? "文字起こし中..."}
            </Text>
            {sourceFileName && (
              <Text style={[styles.progressFileName, { color: c.textMuted }]}>{sourceFileName}</Text>
            )}
            {isIndeterminate ? (
              <Text style={[styles.progressIndeterminate, { color: c.textMuted }]}>準備中...</Text>
            ) : (
              <>
                <Text style={[styles.progressPercent, { color: c.primary }]}>{pct}%</Text>
                <View style={[styles.progressBarBg, { backgroundColor: c.border }]}>
                  <View style={[styles.progressBarFill, { backgroundColor: c.primary, width: `${pct}%` }]} />
                </View>
              </>
            )}
            {tp?.completedChunks != null && tp?.totalChunks != null && (
              <Text style={[styles.progressSub, { color: c.textMuted }]}>
                {tp.completedChunks}/{tp.totalChunks} チャンク
              </Text>
            )}
            <View style={[styles.tipBox, { backgroundColor: c.primaryBg }]}>
              <Ionicons name="bulb-outline" size={14} color={c.primary} />
              <Text style={[styles.tipText, { color: c.primary }]}>{TIPS[currentTipIndex]}</Text>
            </View>
          </BounceInView>
        );
      }
      case "completed":
        return (
          <BounceInView key="completed" style={[styles.progressCard, celebration.animatedStyle]}>
            <View style={[styles.completedCircle, { backgroundColor: c.successBg }]}>
              <Ionicons name="checkmark-circle" size={48} color={c.success} />
            </View>
            <Text style={[styles.progressText, { color: c.textPrimary, fontSize: 18 }]}>文字起こし完了！</Text>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: c.primary }]}
              onPress={() => { haptics.celebrateTap(); handleViewResult(); }}
              activeOpacity={0.8}
            >
              <Text style={[styles.actionButtonText, { color: c.textInverse }]}>結果を見る</Text>
            </TouchableOpacity>
          </BounceInView>
        );
      case "failed":
        return (
          <FadeInView key="error" style={styles.progressCard}>
            <Ionicons name="alert-circle-outline" size={36} color={c.error} />
            <Text style={[styles.progressText, { color: c.textPrimary }]}>文字起こしに失敗しました</Text>
            {errorMessage && (
              <Text style={[styles.errorDetail, { color: c.error }]}>{errorMessage}</Text>
            )}
            <View style={styles.errorActions}>
              <TouchableOpacity
                style={[styles.errorButton, { backgroundColor: c.primary }]}
                onPress={handleRetry}
              >
                <Text style={[styles.errorButtonText, { color: c.textInverse }]}>リトライ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.errorButton, { backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border }]}
                onPress={() => pipeline.reset()}
              >
                <Text style={[styles.errorButtonText, { color: c.textPrimary }]}>後で試す</Text>
              </TouchableOpacity>
            </View>
          </FadeInView>
        );
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const disabled = isOfflineMode || isProcessing;

  const getTitle = () => {
    if (recState === "recording") return "録音中...";
    if (recState === "paused") return "一時停止中";
    switch (pipeline.status) {
      case "idle": return "新規録音";
      case "uploading": return "アップロード中";
      case "transcribing": return "文字起こし中...";
      case "completed": return "完了";
      case "failed": return "エラー";
    }
  };

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.15, 0.45],
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <View style={[styles.header, { borderBottomColor: c.divider }]}>
        <TouchableOpacity
          onPress={() => {
            if (recState === "recording" || recState === "paused") {
              Alert.alert(
                "録音をキャンセルしますか？",
                "録音データは破棄されます。",
                [
                  { text: "録音を続ける", style: "cancel" },
                  { text: "やめる", style: "destructive", onPress: () => router.back() },
                ],
              );
            } else if (isProcessing) {
              Alert.alert(
                "処理中です",
                "文字起こし処理を中断して戻りますか？",
                [
                  { text: "待つ", style: "cancel" },
                  { text: "中断する", style: "destructive", onPress: () => router.back() },
                ],
              );
            } else {
              router.back();
            }
          }}
          style={styles.headerBtn}
        >
          <Ionicons name="chevron-back" size={22} color={c.textSecondary} />
          <Text style={[styles.cancel, { color: c.textSecondary }]}>
            {pipeline.status === "idle" && recState === "idle" ? "戻る" : "キャンセル"}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.textPrimary }]}>{getTitle()}</Text>
        <View style={{ width: 80 }} />
      </View>

      <View style={styles.content}>
        {pipeline.status === "idle" && recState === "idle" && !localRecordingPath && (
          <BounceInView delay={0} style={styles.idleContent}>
            <View style={styles.recordButtonWrapper}>
              <Animated.View
                style={[
                  styles.glowRing,
                  {
                    backgroundColor: c.primary,
                    opacity: glowOpacity,
                  },
                ]}
              />
              <TouchableOpacity
                style={[styles.bigRecordOuter, { backgroundColor: c.primaryBg }, disabled && styles.disabled]}
                onPress={handleRecord}
                onPressIn={recordBtn.onPressIn}
                onPressOut={recordBtn.onPressOut}
                disabled={disabled}
                activeOpacity={0.8}
              >
                <View style={[styles.bigRecordInner, { backgroundColor: c.primary }]}>
                  <Ionicons name="mic" size={36} color="#fff" />
                </View>
              </TouchableOpacity>
            </View>
            <Text style={[styles.tapToRecord, { color: c.textPrimary }]}>タップして録音</Text>
            <Text style={[styles.tapSubtext, { color: c.textMuted }]}>または音声ファイルをインポート</Text>

            <FadeInView delay={400}>
              <TouchableOpacity
                style={[styles.importButton, { backgroundColor: c.surface, borderColor: c.border }]}
                onPress={() => { haptics.lightTap(); handleImport(); }}
                disabled={disabled}
                activeOpacity={0.7}
              >
                <Ionicons name="folder-open-outline" size={20} color={c.textSecondary} />
                <Text style={[styles.importText, { color: c.textSecondary }]}>ファイルをインポート</Text>
              </TouchableOpacity>
            </FadeInView>
          </BounceInView>
        )}

        {(recState === "recording" || recState === "paused") && (
          <BounceInView delay={0} style={styles.recordingContainer}>
            <View style={styles.effectLayer} pointerEvents="none">
              {settings.recordingEffect === "ripple" && (
                <RippleEffect color={c.primary} isActive={recState === "recording"} volume={audioVolume} />
              )}
              {settings.recordingEffect === "waveform" && (
                <WaveformEffect color={c.primary} isActive={recState === "recording"} volume={audioVolume} />
              )}
              {settings.recordingEffect === "pulse" && (
                <PulseEffect color={c.primary} isActive={recState === "recording"} volume={audioVolume} />
              )}
            </View>

            <View style={styles.timerContainer}>
              <Text style={[styles.timer, { color: c.textPrimary }]}>{formatTime(elapsed)}</Text>

              {recState === "paused" && (
                <View style={[styles.pausedBadge, { backgroundColor: c.warningBg }]}>
                  <Text style={[styles.pausedText, { color: c.warning }]}>一時停止中</Text>
                </View>
              )}
            </View>
          </BounceInView>
        )}

        {isProcessing && (
          <View style={styles.processingContainer}>
            {renderProgress()}
          </View>
        )}

        {pipeline.status === "completed" && renderProgress()}
        {pipeline.status === "failed" && renderProgress()}

        {localRecordingPath && pipeline.status === "idle" && !isProcessing && (
          <BounceInView key="saved" style={styles.progressCard}>
            <View style={[styles.completedCircle, { backgroundColor: c.successBg }]}>
              <Ionicons name="checkmark-circle" size={48} color={c.success} />
            </View>
            <Text style={[styles.progressText, { color: c.textPrimary, fontSize: 18 }]}>録音完了</Text>
            {sourceFileName && (
              <Text style={[styles.progressFileName, { color: c.textMuted }]}>{sourceFileName}</Text>
            )}
            <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: c.primary }]}
                onPress={() => { haptics.mediumTap(); handleOpenTemplatePicker(); }}
                activeOpacity={0.8}
              >
                <Ionicons name="mic-outline" size={18} color="#fff" />
                <Text style={[styles.actionButtonText, { color: "#fff" }]}>文字起こしする</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: c.surfaceSecondary }]}
                onPress={() => { haptics.lightTap(); handleSaveForLater(); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.actionButtonText, { color: c.textPrimary }]}>後でやる</Text>
              </TouchableOpacity>
            </View>
          </BounceInView>
        )}
      </View>

      {(recState === "recording" || recState === "paused") && (
        <View style={[styles.controls, { backgroundColor: c.surface, borderTopColor: c.divider }]}>
          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: c.surfaceSecondary }]}
            onPress={recState === "recording" ? handlePause : handleResume}
          >
            <Ionicons
              name={recState === "recording" ? "pause" : "play"}
              size={24}
              color={c.textPrimary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.stopButton, { backgroundColor: c.error }]}
            onPress={handleStop}
          >
            <View style={styles.stopIcon} />
          </TouchableOpacity>
        </View>
      )}
      {/* ─── テンプレート選択モーダル ─── */}
      <Modal
        visible={showTemplatePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTemplatePicker(false)}
      >
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: c.overlay }]}
          activeOpacity={1}
          onPress={() => setShowTemplatePicker(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={[styles.tplModalContent, { backgroundColor: c.surface }]}>
            <View style={[styles.tplModalHeader, { borderBottomColor: c.divider }]}>
              <Text style={[styles.tplModalTitle, { color: c.textPrimary }]}>テンプレートを選択</Text>
              <TouchableOpacity onPress={() => setShowTemplatePicker(false)}>
                <Text style={[styles.tplModalClose, { color: c.primary }]}>閉じる</Text>
              </TouchableOpacity>
            </View>

            {templatesLoading ? (
              <View style={styles.tplLoading}>
                <ActivityIndicator size="large" color={c.primary} />
              </View>
            ) : (
              <ScrollView style={styles.tplList}>
                {/* テンプレートを使わない */}
                <TouchableOpacity
                  style={[
                    styles.tplOption,
                    { borderBottomColor: c.divider },
                    selectedTemplateId === null && { backgroundColor: c.primaryBg },
                  ]}
                  onPress={() => setSelectedTemplateId(null)}
                >
                  <Ionicons
                    name={selectedTemplateId === null ? "radio-button-on" : "radio-button-off"}
                    size={20}
                    color={selectedTemplateId === null ? c.primary : c.textMuted}
                  />
                  <View style={styles.tplOptionBody}>
                    <Text style={[styles.tplOptionName, { color: c.textPrimary }]}>
                      テンプレートを使わない
                    </Text>
                    <Text style={[styles.tplOptionDesc, { color: c.textMuted }]}>
                      素の文字起こし結果をそのまま議事録として作成
                    </Text>
                  </View>
                </TouchableOpacity>

                {templates.length === 0 && (
                  <View style={styles.tplEmpty}>
                    <Ionicons name="document-text-outline" size={40} color={c.textMuted} />
                    <Text style={[styles.tplEmptyText, { color: c.textMuted }]}>
                      テンプレートがありません
                    </Text>
                    <Text style={[styles.tplEmptySub, { color: c.textMuted }]}>
                      設定画面から作成できます
                    </Text>
                  </View>
                )}

                {templates.map((tpl) => (
                  <TouchableOpacity
                    key={tpl.id}
                    style={[
                      styles.tplOption,
                      { borderBottomColor: c.divider },
                      selectedTemplateId === tpl.id && { backgroundColor: c.primaryBg },
                    ]}
                    onPress={() => setSelectedTemplateId(tpl.id)}
                  >
                    <Ionicons
                      name={selectedTemplateId === tpl.id ? "radio-button-on" : "radio-button-off"}
                      size={20}
                      color={selectedTemplateId === tpl.id ? c.primary : c.textMuted}
                    />
                    <View style={styles.tplOptionBody}>
                      <View style={styles.tplOptionTitleRow}>
                        <Text style={[styles.tplOptionName, { color: c.textPrimary }]} numberOfLines={1}>
                          {tpl.name}
                        </Text>
                        {tpl.is_default && (
                          <View style={[styles.tplBadge, { backgroundColor: c.primaryBg }]}>
                            <Text style={[styles.tplBadgeText, { color: c.primary }]}>デフォルト</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.tplOptionPreview, { color: c.textSecondary }]} numberOfLines={2}>
                        {tpl.content}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <View style={[styles.tplModalFooter, { borderTopColor: c.divider }]}>
              <TouchableOpacity
                style={[styles.tplStartButton, { backgroundColor: c.primary, opacity: templatesLoading ? 0.5 : 1 }]}
                onPress={handleStartTranscription}
                disabled={templatesLoading}
              >
                <Ionicons name="mic-outline" size={18} color="#fff" />
                <Text style={styles.tplStartButtonText}>文字起こしを開始</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  headerBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  cancel: {
    fontSize: 15,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 100,
  },
  idleContent: {
    alignItems: "center",
  },
  recordButtonWrapper: {
    alignItems: "center",
    justifyContent: "center",
    width: 140,
    height: 140,
  },
  glowRing: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  bigRecordOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  bigRecordInner: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  tapToRecord: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 20,
  },
  tapSubtext: {
    fontSize: 13,
    marginTop: 6,
  },
  importButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 32,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  importText: {
    fontSize: 14,
    fontWeight: "500",
  },
  recordingContainer: {
    flex: 1,
    width: "100%",
  },
  effectLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  timerContainer: {
    alignItems: "center",
    paddingBottom: 10,
  },
  timer: {
    fontSize: 48,
    fontWeight: "300",
    fontVariant: ["tabular-nums"],
    letterSpacing: 2,
  },
  pausedBadge: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pausedText: {
    fontSize: 13,
    fontWeight: "600",
  },
  processingContainer: {
    alignItems: "center",
  },
  controls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 28,
    paddingVertical: 20,
    paddingBottom: 28,
    borderTopWidth: 1,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  stopButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  stopIcon: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: "#fff",
  },
  progressCard: {
    alignItems: "center",
    gap: 8,
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 24,
    borderRadius: BorderRadius.lg,
    width: SCREEN_WIDTH * 0.8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    paddingHorizontal: 8,
  },
  progressPercent: {
    fontSize: 28,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  progressIndeterminate: {
    fontSize: 15,
    fontWeight: "500",
    marginTop: 4,
  },
  progressSub: {
    fontSize: 12,
  },
  progressFileName: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  tipBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
  },
  progressBarBg: {
    width: "100%",
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginTop: 4,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  completedCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  errorDetail: {
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  errorActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  errorButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  errorButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  actionButton: {
    marginTop: 8,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: BorderRadius.md,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  disabled: {
    opacity: 0.5,
  },

  // ── Template Picker Modal ──
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  tplModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
    paddingBottom: 32,
  },
  tplModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  tplModalTitle: { fontSize: 17, fontWeight: "600" },
  tplModalClose: { fontSize: 16, fontWeight: "500" },
  tplLoading: {
    paddingVertical: 48,
    alignItems: "center",
  },
  tplList: {
    maxHeight: 320,
  },
  tplOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  tplOptionBody: {
    flex: 1,
    gap: 2,
  },
  tplOptionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tplOptionName: {
    fontSize: 15,
    fontWeight: "600",
    flexShrink: 1,
  },
  tplOptionDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  tplOptionPreview: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  tplBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  tplBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  tplEmpty: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 4,
  },
  tplEmptyText: {
    fontSize: 14,
    fontWeight: "500",
  },
  tplEmptySub: {
    fontSize: 12,
  },
  tplModalFooter: {
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  tplStartButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  tplStartButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
