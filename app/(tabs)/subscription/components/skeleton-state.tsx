import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Skeleton } from "../../../../src/components/Skeleton";
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
      <Text style={[styles.title, { color: color.textPrimary }]}>
        サブスクリプション
      </Text>

      {/* Current plan skeleton */}
      <View
        style={[
          styles.usageCardSkeleton,
          { backgroundColor: color.surface, marginHorizontal: 24, marginTop: 20 },
        ]}
      >
        <Skeleton width="40%" height={20} borderRadius={6} />
        <Skeleton
          width="100%"
          height={14}
          borderRadius={6}
          style={{ marginTop: 16 }}
        />
        <Skeleton
          width="100%"
          height={6}
          borderRadius={3}
          style={{ marginTop: 12 }}
        />
      </View>

      {/* Plan card skeletons */}
      {Array.from({ length: 3 }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.planCardSkeleton,
            { backgroundColor: color.surface, marginHorizontal: 24, marginTop: 8 },
          ]}
        >
          <View style={styles.planHeaderRow}>
            <Skeleton width={24} height={24} borderRadius={12} />
            <Skeleton width="50%" height={18} borderRadius={6} />
          </View>
          <Skeleton
            width="30%"
            height={14}
            borderRadius={6}
            style={{ marginTop: 10 }}
          />
          <Skeleton
            width="70%"
            height={12}
            borderRadius={6}
            style={{ marginTop: 8 }}
          />
          <Skeleton
            width="90%"
            height={12}
            borderRadius={6}
            style={{ marginTop: 6 }}
          />
        </View>
      ))}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: {
    fontSize: 28,
    fontWeight: "700",
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  usageCardSkeleton: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "transparent",
    padding: 20,
  },
  planCardSkeleton: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "transparent",
  },
  planHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
});
