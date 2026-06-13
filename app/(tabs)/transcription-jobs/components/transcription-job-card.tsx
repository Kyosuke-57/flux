import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SwipeableRow } from "../../../../src/animations/gestures";
import { GlassCard } from "../../../../src/components/Glass";
import { Spacing, BorderRadius } from "../../../../src/theme";
import { formatDate, formatFileSize, statusLabel, statusColor } from "../hooks/utils";
import type { TranscriptionJob } from "../../../../src/types";
import type { ColorsLight } from "../../../../src/theme";

type Props = {
  item: TranscriptionJob;
  onPress: () => void;
  onDelete: () => void;
  onRetry: () => void;
  color: typeof ColorsLight;
};

export function TranscriptionJobCard({
  item,
  onPress,
  onDelete,
  onRetry,
  color,
}: Props) {
  const statusCol = statusColor(item.status);

  return (
    <SwipeableRow onDelete={onDelete}>
      <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
        <GlassCard intensity={25} style={styles.card}>
          {/* 上部: ファイル名 + 日付 */}
          <View style={styles.cardTop}>
            <View style={styles.fileInfo}>
              <Ionicons name="document-outline" size={16} color={color.textMuted} />
              <Text style={[styles.fileName, { color: color.textPrimary }]} numberOfLines={1}>
                {item.file_name}
              </Text>
            </View>
            <Text style={[styles.date, { color: color.textMuted }]}>
              {formatDate(item.created_at)}
            </Text>
          </View>

          {/* ステータスバッジ */}
          <View style={styles.middleRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusCol + "20", borderColor: statusCol }]}>
              <View style={[styles.statusDot, { backgroundColor: statusCol }]} />
              <Text style={[styles.statusText, { color: statusCol }]}>
                {statusLabel(item.status)}
              </Text>
            </View>
            {item.status === "failed" && (
              <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
                <Ionicons name="refresh" size={14} color={color.primary} />
                <Text style={[styles.retryText, { color: color.primary }]}>リトライ</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 下部: サイズ・チャンク情報 */}
          <View style={styles.bottomRow}>
            <Text style={[styles.meta, { color: color.textSecondary }]}>
              {formatFileSize(item.file_size)}
            </Text>
            {item.status === "processing" && item.total_chunks > 0 && (
              <Text style={[styles.meta, { color: color.textSecondary }]}>
                チャンク: {item.completed_chunks}/{item.total_chunks}
              </Text>
            )}
          </View>

          {item.status === "failed" && item.error_message && (
            <Text style={[styles.errorMsg, { color: statusCol }]} numberOfLines={2}>
              {item.error_message}
            </Text>
          )}
        </GlassCard>
      </TouchableOpacity>
    </SwipeableRow>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 24,
    marginTop: 8,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 8,
  },
  fileInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  fileName: { fontSize: 15, fontWeight: "600", flexShrink: 1 },
  date: { fontSize: 12 },
  middleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: { fontSize: 11, fontWeight: "600" },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  retryText: { fontSize: 12, fontWeight: "600" },
  bottomRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 6,
  },
  meta: { fontSize: 12 },
  errorMsg: {
    fontSize: 12,
    marginTop: 6,
    lineHeight: 16,
  },
});
