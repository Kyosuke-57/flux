import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ColorsLight } from "../../../../src/theme";

type Props = {
  selectedCount: number;
  totalCount: number;
  onCancel: () => void;
  onToggleSelectAll: () => void;
  onBulkDelete: () => void;
  color: typeof ColorsLight;
};

export function SelectModeHeader({
  selectedCount,
  totalCount,
  onCancel,
  onToggleSelectAll,
  onBulkDelete,
  color,
}: Props) {
  return (
    <View
      style={[
        styles.header,
        { backgroundColor: color.surface, borderBottomColor: color.divider },
      ]}
    >
      <TouchableOpacity style={styles.btn} onPress={onCancel}>
        <Text style={[styles.action, { color: color.primary }]}>キャンセル</Text>
      </TouchableOpacity>
      <Text style={[styles.title, { color: color.textPrimary }]}>
        {selectedCount} 件選択
      </Text>
      <TouchableOpacity style={styles.btn} onPress={onToggleSelectAll}>
        <Text style={[styles.action, { color: color.primary }]}>
          {selectedCount === totalCount ? "解除" : "すべて選択"}
        </Text>
      </TouchableOpacity>
      {selectedCount > 0 && (
        <TouchableOpacity style={styles.deleteBtn} onPress={onBulkDelete}>
          <Ionicons name="trash-outline" size={20} color={color.error} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  btn: { paddingVertical: 4 },
  action: { fontSize: 16, fontWeight: "500" },
  title: { fontSize: 17, fontWeight: "600", flex: 1, textAlign: "center" },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
});
