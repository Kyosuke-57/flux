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
      <Text style={[styles.title, { color: color.textPrimary }]}>フォルダ</Text>
      <View
        style={[
          styles.searchPlaceholder,
          {
            backgroundColor: color.surface,
            borderColor: color.border,
            marginTop: 12,
            marginHorizontal: 24,
          },
        ]}
      >
        <Skeleton width={18} height={18} borderRadius={9} />
        <Skeleton width="100%" height={18} borderRadius={6} style={{ flex: 1 }} />
      </View>
      {Array.from({ length: 6 }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.rowSkeleton,
            { backgroundColor: color.surface, marginHorizontal: 24, marginTop: 8 },
          ]}
        >
          <Skeleton width={16} height={16} borderRadius={8} />
          <Skeleton width="60%" height={14} borderRadius={6} />
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
  searchPlaceholder: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  rowSkeleton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
});
