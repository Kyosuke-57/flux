import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { SortField, SortDirection } from "../hooks/utils";

type Props = {
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  color: {
    textSecondary: string;
    textMuted: string;
    primary: string;
    primaryBg: string;
    border: string;
  };
};

const sortOptions: { field: SortField; label: string }[] = [
  { field: "date", label: "日付" },
  { field: "name", label: "名前" },
  { field: "status", label: "ステータス" },
];

export function SortControls({ sortField, sortDirection, onSort, color }: Props) {
  return (
    <View style={[styles.container, { borderBottomColor: color.border }]}>
      <View style={styles.inner}>
        <Text style={[styles.label, { color: color.textMuted }]}>並び替え</Text>
        <View style={styles.chips}>
          {sortOptions.map(({ field, label }) => {
            const isActive = sortField === field;
            return (
              <TouchableOpacity
                key={field}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isActive ? color.primaryBg : "transparent",
                    borderColor: isActive ? color.primary : color.border,
                  },
                ]}
                onPress={() => onSort(field)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: isActive ? color.primary : color.textSecondary },
                  ]}
                >
                  {label}
                </Text>
                {isActive && (
                  <Ionicons
                    name={sortDirection === "asc" ? "arrow-up" : "arrow-down"}
                    size={12}
                    color={color.primary}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: "500",
    marginRight: 4,
  },
  chips: {
    flexDirection: "row",
    gap: 6,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
