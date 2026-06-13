import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { ColorsLight } from "../../../../src/theme";

type Props = {
  type: "no-jobs" | "no-results";
  onCreate?: () => void;
  color: typeof ColorsLight;
};

export function EmptyState({ type, onCreate, color }: Props) {
  if (type === "no-jobs") {
    return (
      <View style={styles.centered}>
        <Text style={[styles.title, { color: color.textPrimary }]}>
          文字起こしジョブがありません
        </Text>
        <Text style={[styles.subtext, { color: color.textSecondary }]}>
          録音から文字起こしを開始すると、ここにジョブが表示されます
        </Text>
        {onCreate && (
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: color.primary }]}
            onPress={onCreate}
          >
            <Text style={[styles.createBtnText, { color: color.textInverse }]}>
              + 新規ジョブを作成
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.centered}>
      <Text style={[styles.title, { color: color.textPrimary }]}>
        該当するジョブがありません
      </Text>
      <Text style={[styles.subtext, { color: color.textSecondary }]}>
        フィルター条件を変えてみてください
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
  createBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createBtnText: { fontWeight: "600", fontSize: 15 },
});
