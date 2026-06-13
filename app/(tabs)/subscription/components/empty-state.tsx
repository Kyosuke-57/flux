import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { ColorsLight } from "../../../../src/theme";

type Props = {
  type: "no-subscription" | "no-auth";
  color: typeof ColorsLight;
};

export function EmptyState({ type, color }: Props) {
  if (type === "no-subscription") {
    return (
      <View style={styles.centered}>
        <Text style={[styles.title, { color: color.textPrimary }]}>
          サブスクリプション情報がありません
        </Text>
        <Text style={[styles.subtext, { color: color.textSecondary }]}>
          プラン情報を読み込めませんでした。
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.centered}>
      <Text style={[styles.title, { color: color.textPrimary }]}>
        サインインしてください
      </Text>
      <Text style={[styles.subtext, { color: color.textSecondary }]}>
        サブスクリプションの表示・管理にはログインが必要です。
      </Text>
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
  },
});
