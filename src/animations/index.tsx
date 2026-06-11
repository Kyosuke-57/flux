// アニメーション共通モジュール
// 触覚フィードバック、バウンス、セレブレーションアニメーションを提供

export { triggerHaptic, setHapticsEnabled } from "./haptics";

import React, { useEffect, useRef, useCallback } from "react";
import { Animated, type ViewStyle, type StyleProp } from "react-native";
import { triggerHaptic } from "./haptics";

// ─── useHaptics ────────────────────────────────────────────

/**
 * 触覚フィードバック用フック
 * コンポーネント内で各触覚タイプをメソッドとして呼び出せる
 *
 * @returns 触覚トリガー関数のオブジェクト
 *
 * 使用例:
 *   const haptics = useHaptics();
 *   haptics.mediumTap();
 *   haptics.errorNotification();
 */
export function useHaptics() {
  const lightTap = useCallback(() => triggerHaptic("light"), []);
  const mediumTap = useCallback(() => triggerHaptic("medium"), []);
  const heavyTap = useCallback(() => triggerHaptic("heavy"), []);
  const errorNotification = useCallback(() => triggerHaptic("error"), []);
  const successNotification = useCallback(() => triggerHaptic("success"), []);
  const celebrateTap = useCallback(() => triggerHaptic("success"), []);

  return { lightTap, mediumTap, heavyTap, errorNotification, successNotification, celebrateTap };
}

// ─── useBounce ─────────────────────────────────────────────

/**
 * バウンスアニメーション用フック（プレスイン/アウト対応）
 * TouchableOpacity の onPressIn/onPressOut にバインドして使用
 *
 * @param config - オプション設定 { scaleIn?: number }
 * @returns style: アニメーションスタイル, onPressIn/onPressOut: プレスハンドラ
 *
 * 使用例:
 *   const btn = useBounce({ scaleIn: 0.95 });
 *   <TouchableOpacity onPressIn={btn.onPressIn} onPressOut={btn.onPressOut}>
 */
export function useBounce(config?: { scaleIn?: number; haptic?: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  const scaleIn = config?.scaleIn ?? 0.95;

  const onPressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: scaleIn,
      friction: 3,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [scale, scaleIn]);

  const onPressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 3,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  return { style: { transform: [{ scale }] }, onPressIn, onPressOut };
}

// ─── useCelebration ────────────────────────────────────────

/**
 * セレブレーションアニメーション用フック
 * スケール + 回転の組み合わせでお祝い演出を行う
 *
 * @returns style: アニメーションスタイル, trigger: 発火関数, animatedStyle: 追加のアニメーションスタイル
 *
 * 使用例:
 *   const celebration = useCelebration();
 *   celebration.trigger();
 *   <BounceInView style={[styles.card, celebration.animatedStyle]}>
 */
export function useCelebration() {
  const scale = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  const trigger = useCallback(() => {
    // 回転 → スケールアップ → 戻す のシーケンス
    Animated.sequence([
      Animated.timing(rotate, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1.3,
        friction: 3,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 3,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.timing(rotate, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scale, rotate]);

  const rotateInterpolated = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "15deg"],
  });

  const animatedStyle = {
    transform: [{ scale }, { rotate: rotateInterpolated }],
  };

  return { style: animatedStyle, trigger, animatedStyle };
}

// ─── BounceInView ──────────────────────────────────────────

/**
 * マウント時にフェードイン＋バウンスする Animated.View
 *
 * @param children  - ラップする子要素
 * @param delay     - アニメーション開始の遅延（ミリ秒、デフォルト: 0）
 * @param style     - 追加のスタイル（オプション）
 *
 * 使用例:
 *   <BounceInView delay={300}>
 *     <Text>こんにちは</Text>
 *   </BounceInView>
 */
export const BounceInView: React.FC<{
  children?: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}> = ({ children, delay = 0, style }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 4,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [opacity, scale, delay]);

  return (
    <Animated.View style={[style, { opacity, transform: [{ scale }] }]}>
      {children}
    </Animated.View>
  );
};

// ─── FadeInView ────────────────────────────────────────────

/**
 * マウント時にフェードインする Animated.View
 *
 * @param children  - ラップする子要素
 * @param delay     - アニメーション開始の遅延（ミリ秒、デフォルト: 0）
 * @param style     - 追加のスタイル（オプション）
 *
 * 使用例:
 *   <FadeInView delay={200}>
 *     <Text>表示されます</Text>
 *   </FadeInView>
 */
export const FadeInView: React.FC<{
  children?: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}> = ({ children, delay = 0, style }) => {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [opacity, delay]);

  return <Animated.View style={[style, { opacity }]}>{children}</Animated.View>;
};
