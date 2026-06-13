import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SwipeableRow } from "../../../../src/animations/gestures";
import { GlassCard } from "../../../../src/components/Glass";
import { Spacing, BorderRadius } from "../../../../src/theme";
import type { ExportItem } from "../../../../src/types";
import type { ColorsLight } from "../../../../src/theme";

const FORMAT_LABELS: Record<ExportItem["format"], string> = {
  txt: "テキスト",
  md: "Markdown",
  pdf: "PDF",
};

const FORMAT_COLORS: Record<ExportItem["format"], keyof typeof ColorsLight> = {
  txt: "info",
  md: "primary",
  pdf: "error",
};

type Props = {
  exportItem: ExportItem;
  onPress: () => void;
  onDelete: () => void;
  color: typeof ColorsLight;
};

export function ExportCard({
  exportItem,
  onPress,
  onDelete,
  color,
}: Props) {
  const formatColor = color[FORMAT_COLORS[exportItem.format]];

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
                {exportItem.title}
              </Text>
              <View style={[styles.formatBadge, { backgroundColor: formatColor + "18" }]}>
                <Text style={[styles.formatBadgeText, { color: formatColor }]}>
                  {FORMAT_LABELS[exportItem.format]}
                </Text>
              </View>
            </View>

            <Ionicons name="chevron-forward" size={16} color={color.textMuted} />
          </View>

          <Text style={[styles.date, { color: color.textMuted }]}>
            作成日: {new Date(exportItem.created_at).toLocaleDateString("ja-JP")}
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
  formatBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  formatBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  date: {
    fontSize: 11,
    marginTop: 8,
  },
});
