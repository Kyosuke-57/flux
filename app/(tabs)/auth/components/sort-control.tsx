import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ColorsLight } from "../../../../src/theme";
import type { SortField, SortDirection } from "../hooks/utils";

type Props = {
  sortField: SortField;
  sortDirection: SortDirection;
  onChange: (field: SortField, direction: SortDirection) => void;
  color: typeof ColorsLight;
};

const SORT_OPTIONS: { field: SortField; label: string }[] = [
  { field: "date", label: "日付" },
  { field: "name", label: "名前" },
  { field: "status", label: "ステータス" },
];

export function SortControl({ sortField, sortDirection, onChange, color }: Props) {
  const handlePress = (field: SortField) => {
    if (sortField === field) {
      const next: SortDirection = sortDirection === "asc" ? "desc" : "asc";
      onChange(field, next);
    } else {
      onChange(field, "desc");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: color.background }]}>
      <Text style={[styles.label, { color: color.textMuted }]}>並び替え</Text>
      <View style={styles.row}>
        {SORT_OPTIONS.map((opt) => {
          const isActive = sortField === opt.field;
          return (
            <TouchableOpacity
              key={opt.field}
              style={[
                styles.chip,
                {
                  backgroundColor: isActive ? color.primaryBg : color.surface,
                  borderColor: isActive ? color.primary : color.border,
                },
              ]}
              onPress={() => handlePress(opt.field)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: isActive ? color.primary : color.textSecondary },
                ]}
              >
                {opt.label}
              </Text>
              {isActive && (
                <Ionicons
                  name={sortDirection === "asc" ? "arrow-up" : "arrow-down"}
                  size={14}
                  color={color.primary}
                  style={styles.arrow}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  arrow: {
    marginLeft: 4,
  },
});
