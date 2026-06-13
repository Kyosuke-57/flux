import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { ColorsLight } from "../../../../src/theme";

type Props = {
  type: "no-folders" | "no-results";
  onCreate?: () => void;
  color: typeof ColorsLight;
};

export function EmptyState({ type, onCreate, color }: Props) {
  if (type === "no-folders") {
    return (
      <View style={styles.centered}>
        <Text style={[styles.title, { color: color.textPrimary }]}>
          フォルダがありません
        </Text>
        <Text style={[styles.subtext, { color: color.textSecondary }]}>
          フォルダを作成して、議事録を整理しましょう
        </Text>
        {onCreate && (
          <TouchableOpacity
            style={[styles.createLink, { backgroundColor: color.primary }]}
            onPress={onCreate}
          >
            <Text style={[styles.createLinkText, { color: color.textInverse }]}>
              + フォルダを作成
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.centered}>
      <Text style={[styles.title, { color: color.textPrimary }]}>
        該当するフォルダがありません
      </Text>
      <Text style={[styles.subtext, { color: color.textSecondary }]}>
        検索条件を変えてみてください
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
  createLink: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createLinkText: { fontWeight: "600", fontSize: 15 },
});
