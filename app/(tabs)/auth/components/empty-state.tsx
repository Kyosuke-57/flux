import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { ColorsLight } from "../../../../src/theme";

type Props = {
  onAdd: () => void;
  color: typeof ColorsLight;
};

export function EmptyState({ onAdd, color }: Props) {
  return (
    <View style={styles.centered}>
      <Text style={[styles.title, { color: color.textPrimary }]}>
        認証データがありません
      </Text>
      <Text style={[styles.subtext, { color: color.textSecondary }]}>
        APIキーや外部サービス認証情報を追加すると、BYOKなどの連携機能が利用できます
      </Text>
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: color.primary }]}
        onPress={onAdd}
        activeOpacity={0.8}
      >
        <Text style={[styles.addButtonText, { color: color.textInverse }]}>
          + 認証データを追加
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  title: { fontSize: 18, fontWeight: "600", textAlign: "center" },
  subtext: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  addButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addButtonText: { fontWeight: "600", fontSize: 15 },
});
