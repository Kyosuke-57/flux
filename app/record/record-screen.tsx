import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { useSettings } from "../../src/contexts/SettingsContext";
import { theme, BorderRadius } from "../../src/theme";
import { useHaptics, useBounce, useCelebration, BounceInView } from "../../src/animations";
import { WaveformEffect, PulseEffect } from "../../src/components/RecordingEffects";
import { importAudio } from "../../src/services/recording";
import { getAllTemplates } from "../../src/services/templates";
import { usePipeline } from "../../src/hooks/usePipeline";

import { useRecordingState } from "./hooks/use-recording-state";
import { useVolumeMeter } from "./hooks/use-volume-meter";
import { useBackPress } from "./hooks/use-back-press";
import { RippleEffect } from "./components/ripple-effect";
import { IdleState } from "./components/idle-state";
import { TimerDisplay } from "./components/timer-display";
import { RecordingControls } from "./components/recording-controls";
import { ProgressCard } from "./components/progress-card";
import { TemplatePickerModal } from "./components/template-picker-modal";
import type { Template } from "../../src/types";

export default function RecordScreen() {
  const { settings } = useSettings();
  const c = theme(settings.isDarkMode);
  const haptics = useHaptics();
  const celebration = useCelebration();
  const recordBtn = useBounce({ scaleIn: 0.93, haptic: false });

  // ── パイプライン ──
  const pipeline = usePipeline();
  const isProcessing = pipeline.status === "uploading" || pipeline.status === "transcribing" || pipeline.status === "generating";

  // ── 録音状態 ──
  const {
    recState,
    elapsed,
    sourceFileName,
    localRecordingPath,
    showTemplatePicker,
    setShowTemplatePicker,
    handleRecord,
    handlePause,
    handleResume,
    handleStop,
    formatTime,
    getTitle,
    setSourceFileName,
    setLocalRecordingPath,
  } = useRecordingState();

  // ── 音量メータリング ──
  const audioVolume = useVolumeMeter(recState);

  // ── 戻るボタン ──
  useBackPress(recState, isProcessing);

  // ── グローアニメーション ──
  const glowAnim = useRef(new Animated.Value(0)).current;

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
      return () => {
        glow.stop();
      };
    } else {
      glowAnim.setValue(0);
    }
  }, [recState, glowAnim]);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.15, 0.45],
  });

  // ── フォーカス時リセット ──
  useFocusEffect(
    useCallback(() => {
      pipeline.reset();
      setSourceFileName(null);
    }, []),
  );

  // ── 文字起こし完了 → 自動遷移 ──
  useEffect(() => {
    if (pipeline.status === "completed" || pipeline.status === "generating") {
      if (pipeline.minuteId) {
        celebration.trigger();
        const timer = setTimeout(
          () => router.replace(`/minute/${pipeline.minuteId}`),
          2000,
        );
        return () => clearTimeout(timer);
      }
    }
    if (pipeline.status === "completed") {
      celebration.trigger();
    }
  }, [pipeline.status]);

  // ── テンプレート関連 ──
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

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
  }, [localRecordingPath, setShowTemplatePicker]);

  const handleStartTranscription = useCallback(async () => {
    if (!localRecordingPath) return;
    setShowTemplatePicker(false);
    const selected = selectedTemplateId
      ? templates.find((t) => t.id === selectedTemplateId)
      : null;
    pipeline.startPipeline(localRecordingPath, selected?.content, settings.minutesGenerationMode);
  }, [localRecordingPath, selectedTemplateId, templates, setShowTemplatePicker, settings.minutesGenerationMode]);

  // ── その他の操作 ──
  const handleSaveForLater = () => {
    if (!localRecordingPath) return;
    router.replace(
      `/minute/new?recordingPath=${encodeURIComponent(localRecordingPath)}` as any,
    );
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
            onPress: () => {
              setSourceFileName(fname);
              pipeline.startPipeline(asset.uri);
            },
          },
        ],
      );
    } catch (err: unknown) {
      Alert.alert("エラー", err instanceof Error ? err.message : "音声ファイルのインポートに失敗しました");
    }
  };

  const handleRetry = () => {
    pipeline.reset();
    setSourceFileName(null);
  };

  const handleViewResult = () => {
    if (pipeline.minuteId) {
      const params = localRecordingPath
        ? `?recordingPath=${encodeURIComponent(localRecordingPath)}`
        : "";
      router.replace(`/minute/${pipeline.minuteId}${params}` as any);
    } else {
      router.replace("/minutes");
    }
  };

  const disabled = isProcessing;

  // ── レンダリング ──
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      {/* ヘッダー */}
      <View style={[styles.header, { borderBottomColor: c.divider }]}>
        <TouchableOpacity
          onPress={() => {
            if (recState === "recording" || recState === "paused") {
              Alert.alert(
                "録音をキャンセルしますか？",
                "録音データは破棄されます。",
                [
                  { text: "録音を続ける", style: "cancel" },
                  {
                    text: "やめる",
                    style: "destructive",
                    onPress: () => router.back(),
                  },
                ],
              );
            } else if (isProcessing) {
              Alert.alert(
                "処理中です",
                "文字起こし処理を中断して戻りますか？",
                [
                  { text: "待つ", style: "cancel" },
                  {
                    text: "中断する",
                    style: "destructive",
                    onPress: () => router.back(),
                  },
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
        <Text style={[styles.title, { color: c.textPrimary }]}>
          {getTitle(pipeline.status)}
        </Text>
        <View style={{ width: 80 }} />
      </View>

      {/* コンテンツ */}
      <View style={styles.content}>
        {/* アイドル状態 */}
        {pipeline.status === "idle" && recState === "idle" && !localRecordingPath && (
          <IdleState
            onRecord={handleRecord}
            onImport={handleImport}
            disabled={disabled}
            glowAnim={glowAnim}
            glowOpacity={glowOpacity}
            onPressIn={recordBtn.onPressIn}
            onPressOut={recordBtn.onPressOut}
            haptics={haptics}
            color={c}
          />
        )}

        {/* 録音中 / 一時停止中 */}
        {(recState === "recording" || recState === "paused") && (
          <BounceInView delay={0} style={styles.recordingContainer}>
            <View style={styles.effectLayer} pointerEvents="none">
              {settings.recordingEffect === "ripple" && (
                <RippleEffect
                  color={c.primary}
                  isActive={recState === "recording"}
                  volume={audioVolume}
                />
              )}
              {settings.recordingEffect === "waveform" && (
                <WaveformEffect
                  color={c.primary}
                  isActive={recState === "recording"}
                  volume={audioVolume}
                />
              )}
              {settings.recordingEffect === "pulse" && (
                <PulseEffect
                  color={c.primary}
                  isActive={recState === "recording"}
                  volume={audioVolume}
                />
              )}
            </View>
            <TimerDisplay
              elapsed={elapsed}
              recState={recState}
              formatTime={formatTime}
              color={c}
            />
          </BounceInView>
        )}

        {/* 進行状況 */}
        {isProcessing && (
          <ProgressCard
            status={pipeline.status}
            uploadProgress={pipeline.uploadProgress}
            transcriptionProgress={pipeline.transcriptionProgress}
            errorMessage={pipeline.errorMessage}
            minuteId={pipeline.minuteId}
            sourceFileName={sourceFileName}
            onViewResult={handleViewResult}
            onRetry={handleRetry}
            onReset={() => pipeline.reset()}
            celebration={celebration}
            color={c}
          />
        )}

        {pipeline.status === "generating" && (
          <ProgressCard
            status="generating"
            uploadProgress={100}
            transcriptionProgress={null}
            errorMessage={null}
            minuteId={pipeline.minuteId}
            sourceFileName={sourceFileName}
            onViewResult={handleViewResult}
            onRetry={handleRetry}
            onReset={() => pipeline.reset()}
            color={c}
          />
        )}

        {pipeline.status === "completed" && (
          <ProgressCard
            status="completed"
            uploadProgress={100}
            transcriptionProgress={null}
            errorMessage={null}
            minuteId={pipeline.minuteId}
            sourceFileName={sourceFileName}
            onViewResult={handleViewResult}
            onRetry={handleRetry}
            onReset={() => pipeline.reset()}
            celebration={celebration}
            color={c}
          />
        )}

        {pipeline.status === "failed" && (
          <ProgressCard
            status="failed"
            uploadProgress={pipeline.uploadProgress}
            transcriptionProgress={null}
            errorMessage={pipeline.errorMessage}
            minuteId={pipeline.minuteId}
            sourceFileName={sourceFileName}
            onViewResult={handleViewResult}
            onRetry={handleRetry}
            onReset={() => pipeline.reset()}
            color={c}
          />
        )}

        {/* 録音完了後（文字起こし待ち） */}
        {localRecordingPath && pipeline.status === "idle" && !isProcessing && (
          <BounceInView key="saved" style={styles.progressCard}>
            <View style={[styles.completedCircle, { backgroundColor: c.successBg }]}>
              <Ionicons name="checkmark-circle" size={48} color={c.success} />
            </View>
            <Text style={[styles.progressText, { color: c.textPrimary, fontSize: 18 }]}>
              録音完了
            </Text>
            {sourceFileName && (
              <Text style={[styles.progressFileName, { color: c.textMuted }]}>
                {sourceFileName}
              </Text>
            )}
            <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: c.primary }]}
                onPress={() => {
                  haptics.mediumTap();
                  handleOpenTemplatePicker();
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="mic-outline" size={18} color="#fff" />
                <Text style={[styles.actionButtonText, { color: "#fff" }]}>
                  文字起こしする
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: c.surfaceSecondary },
                ]}
                onPress={() => {
                  haptics.lightTap();
                  handleSaveForLater();
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.actionButtonText, { color: c.textPrimary }]}>
                  後でやる
                </Text>
              </TouchableOpacity>
            </View>
          </BounceInView>
        )}
      </View>

      {/* 録音コントロール（一時停止/停止） */}
      {(recState === "recording" || recState === "paused") && (
        <RecordingControls
          recState={recState}
          onPause={handlePause}
          onResume={handleResume}
          onStop={handleStop}
          color={c}
        />
      )}

      {/* テンプレート選択モーダル */}
      <TemplatePickerModal
        visible={showTemplatePicker}
        templates={templates}
        templatesLoading={templatesLoading}
        selectedTemplateId={selectedTemplateId}
        onSelectTemplate={setSelectedTemplateId}
        onStartTranscription={handleStartTranscription}
        onClose={() => setShowTemplatePicker(false)}
        color={c}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  cancel: { fontSize: 15 },
  title: { fontSize: 16, fontWeight: "600" },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 100,
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
  progressCard: {
    alignItems: "center",
    gap: 8,
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 24,
    borderRadius: BorderRadius.lg,
    width: "80%",
  },
  progressText: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    paddingHorizontal: 8,
  },
  progressFileName: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  completedCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
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
});
