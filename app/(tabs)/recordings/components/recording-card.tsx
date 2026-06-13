import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../../../../src/components/Glass";
import { Spacing } from "../../../../src/theme";
import type { Recording } from "../../../../src/types";
import type { ColorsLight } from "../../../../src/theme";
import { formatDate, getDurationLabel, getTranscribedLabel } from "../hooks/utils";

type Props = {
  item: Recording;
  onEdit: (item: Recording) => void;
  onDelete: (id: string) => void;
  color: typeof ColorsLight;
};

export function RecordingCard({ item, onEdit, onDelete, color }: Props) {
  const transcribed = item.transcribed;
  return (
    <View style={styles.wrapper}>
      <GlassCard intensity={25} style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.titleGroup}>
            <Ionicons
              name={transcribed ? "checkmark-circle" : "time-outline"}
              size={18}
              color={transcribed ? color.success : color.textMuted}
            />
            <Text
              style={[styles.title, { color: color.textPrimary }]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: transcribed ? color.successBg : color.primaryBg }]}>
            <Text style={[styles.badgeText, { color: transcribed ? color.success : color.primary }]}>
              {getTranscribedLabel(transcribed)}
            </Text>
          </View>
        </View>

        {item.file_path ? (
          <Text style={[styles.filePath, { color: color.textMuted }]} numberOfLines={1}>
            {item.file_path}
          </Text>
        ) : null}

        <View style={styles.metaRow}>
          <Text style={[styles.metaText, { color: color.textSecondary }]}>
            {getDurationLabel(item.duration_seconds)}
          </Text>
          <Text style={[styles.dateText, { color: color.textMuted }]}>
            {formatDate(item.created_at)}
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: color.border }]} />
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => onEdit(item)}>
            <Ionicons name="pencil-outline" size={16} color={color.primary} />
            <Text style={[styles.actionText, { color: color.primary }]}>編集</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => onDelete(item.id)}>
            <Ionicons name="trash-outline" size={16} color={color.error} />
            <Text style={[styles.actionText, { color: color.error }]}>削除</Text>
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
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    flexShrink: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  filePath: {
    fontSize: 12,
    marginTop: 6,
    fontFamily: "monospace",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  metaText: {
    fontSize: 13,
    fontWeight: "500",
  },
  dateText: {
    fontSize: 11,
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
