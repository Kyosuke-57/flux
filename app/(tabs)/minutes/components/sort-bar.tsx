import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { ColorsLight } from "../../../../src/theme";
import type { SortOption } from "../hooks/use-minutes-data";

type Props = {
  sortBy: SortOption;
  onSortChange: (option: SortOption) => void;
  color: typeof ColorsLight;
};

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: "newest", label: "新しい順" },
  { key: "oldest", label: "古い順" },
  { key: "title", label: "名前順" },
];

export function SortBar({ sortBy, onSortChange, color }: Props) {
  return (
    <View style={[styles.row, { borderBottomColor: color.divider }]}>
      <Text style={[styles.label, { color: color.textMuted }]}>並び替え:</Text>
      {SORT_OPTIONS.map((opt) => (
        <TouchableOpacity
          key={opt.key}
          style={[
            styles.chip,
            { backgroundColor: color.surfaceSecondary },
            sortBy === opt.key && { backgroundColor: color.primary },
          ]}
          onPress={() => onSortChange(opt.key)}
        >
          <Text
            style={[
              styles.chipText,
              { color: color.textSecondary },
              sortBy === opt.key && { color: color.textInverse, fontWeight: "600" },
            ]}
          >
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
  },
  label: { fontSize: 12, fontWeight: "500", marginRight: 2 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  chipText: { fontSize: 12, fontWeight: "500" },
});
