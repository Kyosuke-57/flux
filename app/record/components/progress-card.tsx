import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BounceInView, FadeInView } from "../../../src/animations";
import { BorderRadius } from "../../../src/theme";
import { UploadingIcon } from "./uploading-icon";
import { AnimatedHourglass } from "./animated-hourglass";
import type { ColorsLight } from "../../../src/theme";
import type { PipelineState } from "../../../src/hooks/usePipeline";

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

type TranscriptionProgressData = {
  completedChunks?: number;
  totalChunks?: number;
  progressDetail?: string;
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
  // TIPS のローテーション
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  useEffect(() => {
    if (status !== "transcribing") return;
    const tipTimer = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % TIPS.length);
    }, 6000);
    return () => clearInterval(tipTimer);
  }, [status]);

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

      return (
        <BounceInView key="transcribing" style={styles.card}>
          <AnimatedHourglass
            color={color.primary}
            isDeterminate={!isIndeterminate}
          />
          <Text style={[styles.text, { color: color.textPrimary }]}>
            {tp?.progressDetail ?? "文字起こし中..."}
          </Text>
          {sourceFileName && (
            <Text style={[styles.fileName, { color: color.textMuted }]}>
              {sourceFileName}
            </Text>
          )}
          {isIndeterminate ? (
            <Text style={[styles.indeterminate, { color: color.textMuted }]}>
              準備中...
            </Text>
          ) : (
            <>
              <Text style={[styles.percent, { color: color.primary }]}>
                {pct}%
              </Text>
              <View style={[styles.barBg, { backgroundColor: color.border }]}>
                <View
                  style={[
                    styles.barFill,
                    {
                      backgroundColor: color.primary,
                      width: `${pct}%` as any,
                    },
                  ]}
                />
              </View>
            </>
          )}
          {tp?.completedChunks != null && tp?.totalChunks != null && (
            <Text style={[styles.sub, { color: color.textMuted }]}>
              {tp.completedChunks}/{tp.totalChunks} チャンク
            </Text>
          )}
          <View style={[styles.tipBox, { backgroundColor: color.primaryBg }]}>
            <Ionicons name="bulb-outline" size={14} color={color.primary} />
            <Text style={[styles.tipText, { color: color.primary }]}>
              {TIPS[currentTipIndex]}
            </Text>
          </View>
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
  sub: {
    fontSize: 12,
  },
  fileName: {
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
