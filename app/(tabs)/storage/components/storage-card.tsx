import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../../../../src/components/Glass";
import { Spacing } from "../../../../src/theme";
import type { Recording } from "../../../../src/types";
import type { ColorsLight } from "../../../../src/theme";
import { formatDate, formatDuration } from "../hooks/utils";

type Props = {
  item: Recording;
  onEdit: (item: Recording) => void;
  onDelete: (id: string) => void;
  color: typeof ColorsLight;
};

export function StorageCard({ item, onEdit, onDelete, color }: Props) {
  return (
    <View style={styles.wrapper}>
      <GlassCard intensity={25} style={styles.card}>
        {/* トップ行: タイトル */}
        <View style={styles.topRow}>
          <Ionicons
            name={item.transcribed ? "checkmark-circle" : "cloud-done-outline"}
            size={20}
            color={item.transcribed ? color.success : color.textMuted}
          />
          <Text
            style={[styles.title, { color: color.textPrimary }]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
        </View>

        {/* ステータスバッジ */}
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: item.transcribed ? color.successBg : color.primaryBg },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: item.transcribed ? color.success : color.primary },
              ]}
            >
              {item.transcribed ? "文字起こし済み" : "未文字起こし"}
            </Text>
          </View>
        </View>

        {/* ファイルパス */}
        <Text
          style={[styles.filePath, { color: color.textSecondary }]}
          numberOfLines={1}
        >
          {item.file_path}
        </Text>

        {/* メタ情報 */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons
              name="timer-outline"
              size={12}
              color={color.textMuted}
            />
            <Text style={[styles.metaText, { color: color.textMuted }]}>
              {formatDuration(item.duration_seconds)}
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
  title: {
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
  filePath: {
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
