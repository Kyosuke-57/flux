import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ColorsLight } from "../../../../src/theme";

type Props = {
  type: "initial" | "no-results";
  query: string;
  color: typeof ColorsLight;
};

export function EmptyState({ type, query, color }: Props) {
  if (type === "initial") {
    return (
      <View style={styles.centered}>
        <View style={[styles.iconCircle, { backgroundColor: color.primaryBg }]}>
          <Ionicons name="search" size={32} color={color.primary} />
        </View>
        <Text style={[styles.title, { color: color.textPrimary }]}>
          すべてのデータを検索
        </Text>
        <Text style={[styles.subtext, { color: color.textSecondary }]}>
          議事録、録音、文字起こしをまとめて検索できます
        </Text>
        <Text style={[styles.hint, { color: color.textMuted }]}>
          キーワードを入力して検索を開始
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.centered}>
      <View style={[styles.iconCircle, { backgroundColor: color.warningBg }]}>
        <Ionicons name="search-outline" size={28} color={color.warning} />
      </View>
      <Text style={[styles.title, { color: color.textPrimary }]}>
        該当する結果がありません
      </Text>
      <Text style={[styles.subtext, { color: color.textSecondary }]}>
        「{query}」に一致するデータは見つかりませんでした。
      </Text>
      <Text style={[styles.hint, { color: color.textMuted }]}>
        キーワードを変えてみてください
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
    paddingBottom: 64,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  subtext: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 8,
  },
  hint: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
});
