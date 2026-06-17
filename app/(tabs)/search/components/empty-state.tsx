import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { EmptyState as CommonEmptyState } from "../../../../src/components/EmptyState";
import type { ColorsLight } from "../../../../src/theme";

type Props = {
  type: "initial" | "no-results";
  query: string;
  color: typeof ColorsLight;
};

export function EmptyState({ type, query, color }: Props) {
  if (type === "initial") {
    return (
      <CommonEmptyState
        title="すべてのデータを検索"
        subtext="議事録、録音、文字起こしをまとめて検索できます"
        color={color}
        topContent={
          <View style={[styles.iconCircle, { backgroundColor: color.primaryBg }]}>
            <Ionicons name="search" size={32} color={color.primary} />
          </View>
        }
      />
    );
  }
  return (
    <CommonEmptyState
      title="該当する結果がありません"
      subtext={
        "「" + query + "」に一致するデータは見つかりませんでした。キーワードを変えてみてください"
      }
      color={color}
      topContent={
        <View style={[styles.iconCircle, { backgroundColor: color.warningBg }]}>
          <Ionicons name="search-outline" size={28} color={color.warning} />
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
});
