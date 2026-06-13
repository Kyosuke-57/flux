import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Skeleton } from "../../../../src/components/Skeleton";
import type { ColorsLight } from "../../../../src/theme";

type Props = {
  color: typeof ColorsLight;
};

export function LoadingSkeleton({ color }: Props) {
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: color.background }]}
      edges={["top", "left", "right"]}
    >
      <Text style={[styles.title, { color: color.textPrimary }]}>認証データ</Text>
      <View style={styles.list}>
        {Array.from({ length: 3 }).map((_, i) => (
          <View key={i} style={[styles.card, { backgroundColor: color.surface }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Skeleton width="40%" height={16} borderRadius={6} />
              <Skeleton width={50} height={14} borderRadius={6} />
            </View>
            <Skeleton width="65%" height={14} borderRadius={6} style={{ marginTop: 8 }} />
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

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
          認証データの管理にはログインが必要です。
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
  list: { paddingHorizontal: 24, paddingTop: 16, gap: 8 },
  card: {
    padding: 16,
    borderRadius: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: "600", textAlign: "center" },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
});
