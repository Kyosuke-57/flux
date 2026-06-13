import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";
import type { ColorsLight } from "../../../../src/theme";

type Props = {
  color: typeof ColorsLight;
};

export function LoadingSkeleton({ color }: Props) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <View style={[styles.container, { backgroundColor: color.background }]}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Animated.View
          key={i}
          style={[
            styles.skeleton,
            { backgroundColor: color.surfaceSecondary, opacity },
          ]}
        />
      ))}
    </View>
  );
}

export function UnauthenticatedView({ color }: Props) {
  return (
    <View style={[styles.container, styles.centered]}>
      {/* 実際の未認証ビューは検索画面では簡略化 — ミニマル表示 */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  skeleton: {
    height: 80,
    borderRadius: 12,
    marginBottom: 12,
  },
});
