import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { SortField, SortDirection } from "../hooks/utils";
import type { ColorsLight } from "../../../../src/theme";

type Props = {
  sortField: SortField;
  sortDirection: SortDirection;
  onToggle: (field: SortField) => void;
  color: typeof ColorsLight;
};

const SORT_OPTIONS: { field: SortField; label: string }[] = [
  { field: "date", label: "日付" },
  { field: "name", label: "名前" },
  { field: "status", label: "ステータス" },
];

export function SortControls({ sortField, sortDirection, onToggle, color }: Props) {
  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: color.textMuted }]}>並び替え</Text>
      <View style={styles.row}>
        {SORT_OPTIONS.map((opt) => {
          const isActive = sortField === opt.field;
          const iconName = sortDirection === "asc" ? "arrow-up" : "arrow-down";
          return (
            <TouchableOpacity
              key={opt.field}
              style={[
                styles.pill,
                {
                  backgroundColor: isActive ? color.primaryBg : color.surfaceSecondary,
                  borderColor: isActive ? color.primary : color.border,
                },
              ]}
              onPress={() => onToggle(opt.field)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.pillText,
                  { color: isActive ? color.primary : color.textSecondary },
                ]}
              >
                {opt.label}
              </Text>
              {isActive && (
                <Ionicons
                  name={iconName}
                  size={12}
                  color={color.primary}
                  style={styles.icon}
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
    paddingTop: 12,
    paddingBottom: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "600",
  },
  icon: {
    marginLeft: 4,
  },
});
