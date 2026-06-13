import React from "react";
import { View, Text, TouchableOpacity, Switch, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../../../../src/components/Glass";
import { Spacing } from "../../../../src/theme";
import type { AuthData } from "../../../../src/types";
import type { ColorsLight } from "../../../../src/theme";
import { maskApiKey, getProviderLabel, formatDate } from "../hooks/utils";

type Props = {
  item: AuthData;
  onEdit: (item: AuthData) => void;
  onDelete: (id: string) => void;
  onToggleActive: (item: AuthData) => void;
  color: typeof ColorsLight;
};

export function AuthDataCard({ item, onEdit, onDelete, onToggleActive, color }: Props) {
  return (
    <View style={styles.wrapper}>
      <GlassCard intensity={25} style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.titleGroup}>
            <View style={[styles.dot, { backgroundColor: item.is_active ? color.success : color.textMuted }]} />
            <Text
              style={[styles.label, { color: color.textPrimary }]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
          </View>
          <Switch
            value={item.is_active}
            onValueChange={() => onToggleActive(item)}
            trackColor={{ false: color.toggleBg, true: color.primaryBg }}
            thumbColor={item.is_active ? color.primary : "#fff"}
          />
        </View>
        <View style={styles.metaRow}>
          <Text style={[styles.provider, { color: color.textSecondary }]}>
            {getProviderLabel(item.provider)}
          </Text>
          <Text style={[styles.maskedKey, { color: color.textMuted }]}>
            {maskApiKey(item.api_key)}
          </Text>
        </View>
        <Text style={[styles.date, { color: color.textMuted }]}>
          {formatDate(item.created_at)}
        </Text>
        <View style={[styles.divider, { backgroundColor: color.border }]} />
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onEdit(item)}
          >
            <Ionicons name="pencil-outline" size={16} color={color.primary} />
            <Text style={[styles.actionText, { color: color.primary }]}>編集</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onDelete(item.id)}
          >
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
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  provider: {
    fontSize: 13,
    fontWeight: "500",
  },
  maskedKey: {
    fontSize: 12,
    fontFamily: "monospace",
  },
  date: {
    fontSize: 11,
    marginTop: 4,
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
