import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Skeleton } from "../../../../src/components/Skeleton";
import { Spacing, BorderRadius } from "../../../../src/theme";
import type { ColorsLight } from "../../../../src/theme";

type Props = {
  color: typeof ColorsLight;
};

/** ローディング中のスケルトン表示 */
export function LoadingSkeleton({ color }: Props) {
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: color.background }]}
      edges={["top", "left", "right"]}
    >
      <Text style={[styles.title, { color: color.textPrimary }]}>文字起こし管理</Text>
      <View style={styles.filterRow}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} width={60} height={28} borderRadius={14} />
        ))}
      </View>
      <View style={styles.list}>
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} style={[styles.cardSkeleton, { backgroundColor: color.surface }]}>
            <Skeleton width="70%" height={14} borderRadius={6} />
            <Skeleton width="30%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
            <Skeleton width="50%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

/** 未認証時の表示 */
export function UnauthenticatedView({ color }: Props) {
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: color.background }]}
      edges={["top", "left", "right"]}
    >
      <View style={styles.centered}>
        <Text style={[styles.emptyTitle, { color: color.textPrimary }]}>
          サインインしてください
        </Text>
        <Text style={[styles.emptySubtext, { color: color.textSecondary }]}>
          文字起こしジョブの表示・管理にはログインが必要です。
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
  },
  list: {
    paddingHorizontal: 24,
    paddingTop: 8,
    gap: 8,
  },
  cardSkeleton: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: 6,
  },
  emptyTitle: { fontSize: 18, fontWeight: "600", textAlign: "center" },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
});
