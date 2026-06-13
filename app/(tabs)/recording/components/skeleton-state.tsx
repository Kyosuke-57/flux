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
      <Text style={[styles.title, { color: color.textPrimary }]}>
        録音データ
      </Text>
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          style={[
            styles.cardPlaceholder,
            {
              backgroundColor: color.surface,
              borderColor: color.border,
            },
          ]}
        >
          <Skeleton width="60%" height={18} borderRadius={6} />
          <Skeleton
            width="40%"
            height={14}
            borderRadius={6}
            style={{ marginTop: 8 }}
          />
          <Skeleton
            width="30%"
            height={12}
            borderRadius={6}
            style={{ marginTop: 8 }}
          />
        </View>
      ))}
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
          録音データの表示・管理にはログインが必要です。
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
  cardPlaceholder: {
    marginHorizontal: 24,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  emptyTitle: { fontSize: 18, fontWeight: "600", textAlign: "center" },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
});
