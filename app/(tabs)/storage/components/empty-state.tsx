import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { ColorsLight } from "../../../../src/theme";

type Props = {
  color: typeof ColorsLight;
  onCreate: () => void;
};

export function EmptyState({ color, onCreate }: Props) {
  return (
    <View style={styles.centered}>
      <Text style={[styles.title, { color: color.textPrimary }]}>
        録音データがありません
      </Text>
      <Text style={[styles.subtext, { color: color.textSecondary }]}>
        保存した録音データがここに表示されます
      </Text>
      <TouchableOpacity
        style={[styles.createLink, { backgroundColor: color.primary }]}
        onPress={onCreate}
      >
        <Text style={[styles.createLinkText, { color: color.textInverse }]}>
          + 新規作成
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
  createLink: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createLinkText: { fontWeight: "600", fontSize: 15 },
});
