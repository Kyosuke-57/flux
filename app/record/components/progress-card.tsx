import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BounceInView, FadeInView } from "../../../src/animations";
import { BorderRadius } from "../../../src/theme";
import { UploadingIcon } from "./uploading-icon";
import { AnimatedHourglass } from "./animated-hourglass";
import { LiveTranscript } from "./live-transcript";
import type { ColorsLight } from "../../../src/theme";
import type { PipelineState } from "../../../src/hooks/usePipeline";

type TranscriptionProgressData = {
  completedChunks?: number;
  totalChunks?: number;
  progressDetail?: string;
  transcript?: string;
  status?: string;
  minuteId?: string;
  errorMessage?: string;
};

type Props = {
  status: PipelineState;
  uploadProgress: number;
  transcriptionProgress: TranscriptionProgressData | null;
  errorMessage: string | null;
  minuteId: string | undefined;
  sourceFileName: string | null;
  onViewResult: () => void;
  onRetry: () => void;
  onReset: () => void;
  animatedStyle?: any;
  celebration?: { animatedStyle?: any };
  color: typeof ColorsLight;
};

export function ProgressCard({
  status,
  uploadProgress,
  transcriptionProgress,
  errorMessage,
  sourceFileName,
  onViewResult,
  onRetry,
  onReset,
  celebration,
  color,
}: Props) {
  if (status === "idle") return null;

  switch (status) {
    case "uploading":
      return (
        <BounceInView key="uploading" style={styles.card}>
          <UploadingIcon color={color.primary} />
          <Text style={[styles.text, { color: color.textPrimary }]}>
            {uploadProgress < 100 ? "アップロード中..." : "アップロード完了"}
          </Text>
          {sourceFileName && (
            <Text style={[styles.fileName, { color: color.textMuted }]}>
              {sourceFileName}
            </Text>
          )}
          <Text style={[styles.percent, { color: color.primary }]}>
            {uploadProgress}%
          </Text>
          <View style={[styles.barBg, { backgroundColor: color.border }]}>
            <View
              style={[
                styles.barFill,
                {
                  backgroundColor: color.primary,
                  width: `${uploadProgress}%` as any,
                },
              ]}
            />
          </View>
        </BounceInView>
      );

    case "transcribing": {
      const tp = transcriptionProgress;
      const hasChunks = tp?.totalChunks != null && tp.totalChunks > 0;
      const pct = hasChunks
        ? Math.round((tp.completedChunks! / tp.totalChunks!) * 100)
        : 0;
      const isIndeterminate = !hasChunks || pct === 0;
      const transcriptText = tp?.transcript ?? "";

      return (
        <BounceInView
          key="transcribing"
          style={[
            styles.card,
            {
              width: "90%",
              maxHeight: 500,
              backgroundColor: color.surface,
              borderRadius: BorderRadius.lg,
              padding: 16,
              borderWidth: 1,
              borderColor: color.cardBorder,
            },
          ]}
        >
          {/* ヘッダー行 */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <AnimatedHourglass
              color={color.primary}
              isDeterminate={!isIndeterminate}
            />
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: color.textPrimary,
                flex: 1,
              }}
            >
              文字起こし中...
            </Text>
          </View>
          {sourceFileName && (
            <Text style={{ fontSize: 12, color: color.textMuted }}>
              {sourceFileName}
            </Text>
          )}

          {/* ライブトランスクリプト */}
          <LiveTranscript transcript={transcriptText} color={color} />

          {/* 進捗セクション */}
          {isIndeterminate ? (
            <Text
              style={{
                fontSize: 14,
                color: color.textMuted,
                textAlign: "center",
                marginTop: 8,
              }}
            >
              準備中...
            </Text>
          ) : (
            <>
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: "700",
                  color: color.primary,
                  textAlign: "center",
                  marginTop: 4,
                }}
              >
                {pct}%
              </Text>
              <View
                style={{
                  height: 6,
                  backgroundColor: color.border,
                  borderRadius: 3,
                  overflow: "hidden",
                  marginTop: 4,
                }}
              >
                <View
                  style={{
                    height: "100%",
                    backgroundColor: color.primary,
                    borderRadius: 3,
                    width: `${pct}%` as any,
                  }}
                />
              </View>
              <Text
                style={{
                  fontSize: 12,
                  color: color.textMuted,
                  textAlign: "center",
                  marginTop: 4,
                }}
              >
                {tp.completedChunks}/{tp.totalChunks} チャンク
              </Text>
            </>
          )}
        </BounceInView>
      );
    }

    case "generating":
      return (
        <BounceInView key="generating" style={styles.card}>
          <AnimatedHourglass
            color={color.primary}
            isDeterminate={false}
          />
          <Text style={[styles.text, { color: color.textPrimary }]}>
            議事録生成中...
          </Text>
          {sourceFileName && (
            <Text style={[styles.fileName, { color: color.textMuted }]}>
              {sourceFileName}
            </Text>
          )}
          <Text style={[styles.indeterminate, { color: color.textMuted }]}>
            文字起こし完了。議事録を作成しています...
          </Text>
        </BounceInView>
      );

    case "completed":
      return (
        <BounceInView
          key="completed"
          style={[
            styles.card,
            celebration?.animatedStyle,
          ]}
        >
          <View
            style={[styles.circle, { backgroundColor: color.successBg }]}
          >
            <Ionicons
              name="checkmark-circle"
              size={48}
              color={color.success}
            />
          </View>
          <Text
            style={[
              styles.text,
              { color: color.textPrimary, fontSize: 18 },
            ]}
          >
            文字起こし完了！
          </Text>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: color.primary }]}
            onPress={onViewResult}
            activeOpacity={0.8}
          >
            <Text style={[styles.actionText, { color: color.textInverse }]}>
              結果を見る
            </Text>
          </TouchableOpacity>
        </BounceInView>
      );

    case "failed":
      return (
        <FadeInView key="error" style={styles.card}>
          <Ionicons name="alert-circle-outline" size={36} color={color.error} />
          <Text style={[styles.text, { color: color.textPrimary }]}>
            文字起こしに失敗しました
          </Text>
          {errorMessage && (
            <Text style={[styles.errorDetail, { color: color.error }]}>
              {errorMessage}
            </Text>
          )}
          <View style={styles.errorActions}>
            <TouchableOpacity
              style={[styles.errorBtn, { backgroundColor: color.primary }]}
              onPress={onRetry}
            >
              <Text style={[styles.errorBtnText, { color: color.textInverse }]}>
                リトライ
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.errorBtn,
                {
                  backgroundColor: color.surfaceSecondary,
                  borderWidth: 1,
                  borderColor: color.border,
                },
              ]}
              onPress={onReset}
            >
              <Text
                style={[styles.errorBtnText, { color: color.textPrimary }]}
              >
                後で試す
              </Text>
            </TouchableOpacity>
          </View>
        </FadeInView>
      );

    default:
      return null;
  }
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    gap: 8,
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 24,
    borderRadius: BorderRadius.lg,
    width: "80%",
  },
  text: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    paddingHorizontal: 8,
  },
  percent: {
    fontSize: 28,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  indeterminate: {
    fontSize: 15,
    fontWeight: "500",
    marginTop: 4,
  },
  fileName: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  barBg: {
    width: "100%",
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginTop: 4,
  },
  barFill: {
    height: "100%",
    borderRadius: 3,
  },
  circle: {
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
  errorBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  errorBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  actionBtn: {
    marginTop: 8,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: BorderRadius.md,
  },
  actionText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
