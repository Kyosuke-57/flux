import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { ColorsLight } from "../../../../src/theme";

type Props = {
  type: "no-minutes" | "no-results";
  onRecord?: () => void;
  color: typeof ColorsLight;
};

export function EmptyState({ type, onRecord, color }: Props) {
  if (type === "no-minutes") {
    return (
      <View style={styles.centered}>
        <Text style={[styles.title, { color: color.textPrimary }]}>
          まだ議事録がありません
        </Text>
        <Text style={[styles.subtext, { color: color.textSecondary }]}>
          会議を録音して、最初の議事録を作成しましょう
        </Text>
        {onRecord && (
          <TouchableOpacity
            style={[styles.recordLink, { backgroundColor: color.primary }]}
            onPress={onRecord}
          >
            <Text style={[styles.recordLinkText, { color: color.textInverse }]}>
              + 会議を録音
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.centered}>
      <Text style={[styles.title, { color: color.textPrimary }]}>
        該当する議事録がありません
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
  recordLink: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  recordLinkText: { fontWeight: "600", fontSize: 15 },
});
