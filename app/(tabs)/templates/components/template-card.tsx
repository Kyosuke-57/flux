import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SwipeableRow } from "../../../../src/animations/gestures";
import { GlassCard } from "../../../../src/components/Glass";
import { Spacing, BorderRadius } from "../../../../src/theme";
import type { Template } from "../../../../src/types";
import type { ColorsLight } from "../../../../src/theme";

type Props = {
  template: Template;
  onPress: () => void;
  onDelete: () => void;
  onToggleDefault: () => void;
  color: typeof ColorsLight;
};

export function TemplateCard({
  template,
  onPress,
  onDelete,
  onToggleDefault,
  color,
}: Props) {
  return (
    <SwipeableRow onDelete={onDelete}>
      <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
        <GlassCard intensity={25} style={styles.card}>
          <View style={styles.topRow}>
            <View style={styles.titleRow}>
              <Text
                style={[styles.name, { color: color.textPrimary }]}
                numberOfLines={1}
              >
                {template.name}
              </Text>
              {template.is_default && (
                <View style={[styles.defaultBadge, { backgroundColor: color.primaryBg }]}>
                  <Text style={[styles.defaultBadgeText, { color: color.primary }]}>
                    デフォルト
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.iconBtn, { backgroundColor: color.surfaceSecondary }]}
                onPress={onToggleDefault}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={template.is_default ? "bookmark" : "bookmark-outline"}
                  size={16}
                  color={template.is_default ? color.primary : color.textMuted}
                />
              </TouchableOpacity>
              <Ionicons name="chevron-forward" size={16} color={color.textMuted} />
            </View>
          </View>

          <Text
            style={[styles.content, { color: color.textSecondary }]}
            numberOfLines={2}
          >
            {template.content}
          </Text>

          <Text style={[styles.date, { color: color.textMuted }]}>
            更新日: {new Date(template.updated_at).toLocaleDateString("ja-JP")}
          </Text>
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
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginRight: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
    flexShrink: 1,
  },
  defaultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  date: {
    fontSize: 11,
    marginTop: 6,
  },
});
