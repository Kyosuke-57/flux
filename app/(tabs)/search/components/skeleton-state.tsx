import React from "react";
import { View, StyleSheet } from "react-native";
import { Skeleton } from "../../../../src/components/Skeleton";
import { UnauthenticatedView as CommonUnauthenticatedView } from "../../../../src/components/FeatureSkeleton";
import type { ColorsLight } from "../../../../src/theme";

type Props = { color: typeof ColorsLight };

export function LoadingSkeleton({ color }: Props) {
  return (
    <View style={[styles.container, { backgroundColor: color.background }]}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View
          key={i}
          style={[
            styles.skeleton,
            { backgroundColor: color.surfaceSecondary },
          ]}
        >
          <Skeleton width="65%" height={14} borderRadius={6} />
          <Skeleton width={50} height={12} borderRadius={4} />
        </View>
      ))}
    </View>
  );
}

export function UnauthenticatedView({ color }: Props) {
  return (
    <CommonUnauthenticatedView
      color={color}
      message="検索機能をご利用いただくにはログインが必要です。"
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  skeleton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
});
