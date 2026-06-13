import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { SortBy, SortOrder } from "../hooks/use-folders-data";
import type { ColorsLight } from "../../../../src/theme";

type Props = {
  sortBy: SortBy;
  sortOrder: SortOrder;
  onChangeSortBy: (by: SortBy) => void;
  onToggleOrder: () => void;
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
  onChangeSortBy,
  onToggleOrder,
  color,
}: Props) {
  const arrowIcon = sortOrder === "desc" ? "arrow-down" : "arrow-up";

  return (
    <View style={styles.container}>
      <View style={styles.chips}>
        {SORT_OPTIONS.map((opt) => {
          const isActive = sortBy === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.chip,
                {
                  backgroundColor: isActive ? color.primary : color.surface,
                  borderColor: isActive ? color.primary : color.border,
                },
              ]}
              onPress={() => onChangeSortBy(opt.key)}
              accessibilityLabel={`${opt.label}でソート`}
            >
              <Text
                style={[
                  styles.chipLabel,
                  { color: isActive ? color.textInverse : color.textSecondary },
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={[styles.orderBtn, { borderColor: color.border }]}
        onPress={onToggleOrder}
        accessibilityLabel={sortOrder === "desc" ? "降順" : "昇順"}
      >
        <Ionicons
          name={arrowIcon}
          size={16}
          color={color.textSecondary}
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
    paddingVertical: 8,
    gap: 8,
  },
  chips: {
    flexDirection: "row",
    gap: 6,
    flex: 1,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  orderBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
