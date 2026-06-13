import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Spacing, BorderRadius } from "../../../../src/theme";
import type { ColorsLight } from "../../../../src/theme";

export type SortBy = "date" | "name" | "status";
export type SortOrder = "asc" | "desc";

type Props = {
  sortBy: SortBy;
  sortOrder: SortOrder;
  onSortByChange: (by: SortBy) => void;
  onSortOrderToggle: () => void;
  color: typeof ColorsLight;
};

const SORT_OPTIONS: { key: SortBy; label: string }[] = [
  { key: "date", label: "日付" },
  { key: "name", label: "名前" },
  { key: "status", label: "ステータス" },
];

export function SortControls({
  sortBy,
  sortOrder,
  onSortByChange,
  onSortOrderToggle,
  color,
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.pills}>
        {SORT_OPTIONS.map((opt) => {
          const active = sortBy === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.pill,
                {
                  backgroundColor: active ? color.primary : color.surfaceSecondary,
                  borderColor: active ? color.primary : color.border,
                },
              ]}
              onPress={() => onSortByChange(opt.key)}
              accessibilityLabel={`${opt.label}で並び替え`}
            >
              <Text
                style={[
                  styles.pillText,
                  { color: active ? color.textInverse : color.textSecondary },
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <TouchableOpacity
        style={[styles.orderButton, { backgroundColor: color.surfaceSecondary }]}
        onPress={onSortOrderToggle}
        accessibilityLabel={`並び順を${sortOrder === "asc" ? "昇順" : "降順"}に切り替え`}
      >
        <Ionicons
          name={sortOrder === "asc" ? "arrow-up" : "arrow-down"}
          size={16}
          color={color.textPrimary}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  pills: {
    flexDirection: "row",
    gap: Spacing.xs,
    flex: 1,
  },
  pill: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "600",
  },
  orderButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
});
