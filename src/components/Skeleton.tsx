import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, ViewStyle, type DimensionValue } from "react-native";
import { useSettings } from "../contexts/SettingsContext";
import { theme, Spacing, BorderRadius } from "../theme";

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const { settings } = useSettings();
  const isDarkMode = settings.isDarkMode;
  const c = theme(isDarkMode);

  const translateX = useRef(new Animated.Value(-200)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(translateX, {
        toValue: 200,
        duration: 1500,
        useNativeDriver: true,
      })
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [translateX]);

  return (
    <View
      style={[
        styles.container,
        {
          width,
          height,
          borderRadius,
          backgroundColor: isDarkMode ? c.surfaceSecondary : c.border,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.shimmer,
          {
            backgroundColor: isDarkMode
              ? "rgba(255,255,255,0.08)"
              : "rgba(255,255,255,0.5)",
            transform: [{ translateX }],
          },
        ]}
      />
    </View>
  );
}

export function SkeletonLine() {
  return <Skeleton width="100%" height={14} borderRadius={8} />;
}

export function HomeScreenSkeleton() {
  const { settings } = useSettings();
  const isDarkMode = settings.isDarkMode;
  const c = theme(isDarkMode);

  return (
    <View style={[styles.homeContainer, { backgroundColor: c.background }]}>
      {/* Header skeleton */}
      <View style={styles.headerSkeleton}>
        <Skeleton width={160} height={28} borderRadius={8} />
        <Skeleton width={120} height={14} borderRadius={6} style={{ marginTop: Spacing.sm }} />
      </View>

      {/* 3 card skeletons */}
      <View style={styles.cardList}>
        <View style={[styles.cardSkeleton, { backgroundColor: c.surface }]}>
          <Skeleton width="70%" height={16} borderRadius={6} />
          <Skeleton width="40%" height={12} borderRadius={4} style={{ marginTop: Spacing.sm }} />
        </View>
        <View style={[styles.cardSkeleton, { backgroundColor: c.surface }]}>
          <Skeleton width="60%" height={16} borderRadius={6} />
          <Skeleton width="50%" height={12} borderRadius={4} style={{ marginTop: Spacing.sm }} />
        </View>
        <View style={[styles.cardSkeleton, { backgroundColor: c.surface }]}>
          <Skeleton width="80%" height={16} borderRadius={6} />
          <Skeleton width="30%" height={12} borderRadius={4} style={{ marginTop: Spacing.sm }} />
        </View>
      </View>
    </View>
  );
}

export function MinutesListSkeleton() {
  const { settings } = useSettings();
  const isDarkMode = settings.isDarkMode;
  const c = theme(isDarkMode);

  return (
    <View style={styles.listContainer}>
      {Array.from({ length: 5 }).map((_, i) => (
        <View key={i} style={[styles.rowSkeleton, { backgroundColor: c.surface }]}>
          <Skeleton width="65%" height={14} borderRadius={6} />
          <Skeleton width={50} height={12} borderRadius={4} />
        </View>
      ))}
    </View>
  );
}

export default Skeleton;

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    position: "relative",
  },
  shimmer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  homeContainer: {
    flex: 1,
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
  },
  headerSkeleton: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  cardList: {
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
  cardSkeleton: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  listContainer: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  rowSkeleton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
});
