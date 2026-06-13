import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Spacing, BorderRadius } from "../../../../src/theme";
import type { ColorsLight } from "../../../../src/theme";

type SortField = "updated_at" | "name" | "is_default";

type Props = {
  sortField: SortField;
  sortDirection: "asc" | "desc";
  onSort: (field: SortField) => void;
  color: typeof ColorsLight;
};

const SORT_OPTIONS: { field: SortField; label: string }[] = [
  { field: "updated_at", label: "日付" },
  { field: "name", label: "名前" },
  { field: "is_default", label: "ステータス" },
];

export function SortControls({ sortField, sortDirection, onSort, color }: Props) {
  return (
    <View style={styles.container}>
      {SORT_OPTIONS.map(({ field, label }) => {
        const isActive = sortField === field;
        const iconName = sortDirection === "asc" ? "arrow-up" : "arrow-down";

        return (
          <TouchableOpacity
            key={field}
            style={[
              styles.chip,
              {
                backgroundColor: isActive ? color.primaryBg : color.surfaceSecondary,
                borderColor: isActive ? color.primary : color.border,
              },
            ]}
            onPress={() => onSort(field)}
            accessibilityLabel={`${label}でソート`}
          >
            <Text
              style={[
                styles.chipLabel,
                { color: isActive ? color.primary : color.textSecondary },
              ]}
            >
              {label}
            </Text>
            {isActive && (
              <Ionicons
                name={iconName}
                size={12}
                color={color.primary}
                style={styles.arrow}
              />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  arrow: {
    marginLeft: 4,
  },
});
