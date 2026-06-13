import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../../../../src/components/Glass";
import { Spacing } from "../../../../src/theme";
import type { TranscriptionJob } from "../../../../src/types";
import type { ColorsLight } from "../../../../src/theme";
import { getStatusLabel, formatDate, formatFileSize } from "../hooks/utils";

type Props = {
  item: TranscriptionJob;
  onEdit: (item: TranscriptionJob) => void;
  onDelete: (id: string) => void;
  color: typeof ColorsLight;
};

const STATUS_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  queued: "time-outline",
  processing: "sync-outline",
  completed: "checkmark-circle",
  failed: "alert-circle",
};

const STATUS_COLORS: Record<string, keyof typeof ColorsLight> = {
  queued: "textMuted",
  processing: "info",
  completed: "success",
  failed: "error",
};

export function R2UploadCard({ item, onEdit, onDelete, color }: Props) {
  const iconName = STATUS_ICON[item.status] ?? "help-outline";
  const statusColorKey = STATUS_COLORS[item.status] ?? "textSecondary";
  const statusColor = color[statusColorKey] as string;

  return (
    <View style={styles.wrapper}>
      <GlassCard intensity={25} style={styles.card}>
        {/* トップ行: ステータスアイコン + ファイル名 */}
        <View style={styles.topRow}>
          <Ionicons name={iconName} size={20} color={statusColor} />
          <Text
            style={[styles.fileName, { color: color.textPrimary }]}
            numberOfLines={1}
          >
            {item.file_name}
          </Text>
        </View>

        {/* ステータスバッジ */}
        <View style={styles.statusRow}>
          <View
            style={[styles.statusBadge, { backgroundColor: color.primaryBg }]}
          >
            <Text style={[styles.statusText, { color: statusColor }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>

        {/* R2キー */}
        <Text
          style={[styles.r2Key, { color: color.textSecondary }]}
          numberOfLines={1}
        >
          r2_key: {item.r2_key}
        </Text>

        {/* メタ情報 */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons
              name="document-outline"
              size={12}
              color={color.textMuted}
            />
            <Text style={[styles.metaText, { color: color.textMuted }]}>
              {formatFileSize(item.file_size)}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons
              name="calendar-outline"
              size={12}
              color={color.textMuted}
            />
            <Text style={[styles.metaText, { color: color.textMuted }]}>
              {formatDate(item.created_at)}
            </Text>
          </View>
        </View>

        {/* エラーメッセージ */}
        {item.status === "failed" && item.error_message && (
          <Text
            style={[styles.errorText, { color: color.error }]}
            numberOfLines={2}
          >
            {item.error_message}
          </Text>
        )}

        {/* アクション */}
        <View style={[styles.divider, { backgroundColor: color.border }]} />
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onEdit(item)}
          >
            <Ionicons name="create-outline" size={16} color={color.primary} />
            <Text style={[styles.actionText, { color: color.primary }]}>
              編集
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onDelete(item.id)}
          >
            <Ionicons name="trash-outline" size={16} color={color.error} />
            <Text style={[styles.actionText, { color: color.error }]}>
              削除
            </Text>
          </TouchableOpacity>
        </View>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 24,
    marginBottom: 8,
  },
  card: {
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fileName: {
    fontSize: 15,
    fontWeight: "600",
    flexShrink: 1,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  r2Key: {
    fontSize: 11,
    marginTop: 4,
    fontFamily: "monospace",
  },
  metaRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 6,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
  errorText: {
    fontSize: 12,
    marginTop: 6,
    lineHeight: 17,
  },
  divider: {
    height: 1,
    marginTop: 10,
    marginBottom: 8,
  },
  actionRow: {
    flexDirection: "row",
    gap: 16,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
