import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Skeleton } from "../../../../src/components/Skeleton";
import { UnauthenticatedView as FeatureSkeletonUnauthenticatedView } from "../../../../src/components/FeatureSkeleton";
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
      <View style={styles.headerPlaceholder}>
        <View>
          <Skeleton width={140} height={28} borderRadius={8} />
          <Skeleton
            width={200}
            height={16}
            borderRadius={6}
            style={{ marginTop: 6 }}
          />
        </View>
        <Skeleton width={28} height={28} borderRadius={14} />
      </View>
      <View style={styles.cardList}>
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              styles.cardPlaceholder,
              { backgroundColor: color.surface, borderColor: color.border },
            ]}
          >
            <Skeleton width="70%" height={18} borderRadius={6} />
            <Skeleton
              width="100%"
              height={14}
              borderRadius={6}
              style={{ marginTop: 8 }}
            />
            <Skeleton
              width="80%"
              height={14}
              borderRadius={6}
              style={{ marginTop: 4 }}
            />
            <Skeleton
              width={60}
              height={24}
              borderRadius={12}
              style={{ marginTop: 10 }}
            />
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

export function UnauthenticatedView({ color }: Props) {
  return (
    <FeatureSkeletonUnauthenticatedView
      color={color}
      message="お気に入りの保存・表示にはログインが必要です。"
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerPlaceholder: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  cardList: {
    paddingHorizontal: 24,
    gap: 12,
  },
  cardPlaceholder: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
});
