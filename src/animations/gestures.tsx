// ジェスチャーアニメーション
// スワイプ可能なリストアイテムの実装
// PanResponder を使用した水平スワイプで削除アクションを表示

import React, { useRef, useCallback } from "react";
import {
  Animated,
  PanResponder,
  type ViewStyle,
  type PanResponderInstance,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { triggerHaptic } from "./haptics";

const SWIPE_THRESHOLD = 80; // スナップ閾値 (px)
const DELETE_BG_WIDTH = 80; // 削除領域の幅

/**
 * スワイプ操作による削除アクションを提供するフック
 *
 * 水平方向に左スワイプすると、背後に赤い削除領域が表示される。
 * 80px 以上スワイプするとスナップオープン、それ未満はクローズ。
 *
 * @param onDelete - 削除実行時のコールバック
 * @returns panResponder と swipeStyle（対象の View に適用するアニメーションスタイル）
 *
 * 使用例:
 *   const { panResponder, swipeStyle } = useSwipeable(() => handleDelete(item.id));
 *   <Animated.View {...panResponder.panHandlers} style={[swipeStyle]}>
 *     <MyListItem />
 *   </Animated.View>
 */
export function useSwipeable(onDelete: () => void): {
  panResponder: PanResponderInstance;
  swipeStyle: Animated.AnimatedProps<ViewStyle>;
} {
  const translateX = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // 水平方向の移動が垂直方向より大きい場合のみスワイプとして扱う
        return (
          Math.abs(gestureState.dx) > 10 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy)
        );
      },
      onPanResponderMove: (_, gestureState) => {
        // 現在位置からさらに左へドラッグ
        const baseX = isOpen.current ? -DELETE_BG_WIDTH : 0;
        const newX = Math.min(0, Math.max(-DELETE_BG_WIDTH * 1.5, baseX + gestureState.dx));
        translateX.setValue(newX);
      },
      onPanResponderRelease: (_, gestureState) => {
        const currentX = (isOpen.current ? -DELETE_BG_WIDTH : 0) + gestureState.dx;

        if (currentX < -SWIPE_THRESHOLD) {
          // 閾値を超えた → スナップオープン
          isOpen.current = true;
          Animated.spring(translateX, {
            toValue: -DELETE_BG_WIDTH,
            friction: 6,
            tension: 80,
            useNativeDriver: true,
          }).start();
          triggerHaptic("light");
        } else {
          // 閾値未満 → クローズ
          isOpen.current = false;
          Animated.spring(translateX, {
            toValue: 0,
            friction: 6,
            tension: 80,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const swipeStyle: Animated.AnimatedProps<ViewStyle> = {
    transform: [{ translateX }],
  };

  return { panResponder, swipeStyle };
}

// ─── SwipeableItem ─────────────────────────────────────────

interface SwipeableItemProps {
  /** メインコンテンツとして表示する子要素 */
  children: React.ReactNode;
  /** 削除ボタン押下時のコールバック */
  onDelete: () => void;
  /** 削除ボタンのラベル（デフォルト: "削除"） */
  deleteLabel?: string;
}

/**
 * スワイプで削除アクションを表示するリストアイテム
 *
 * 左にスワイプすると背後に赤い削除ボタンが現れる。
 * 削除ボタンを押下するか、さらにスワイプすることで削除が実行される。
 *
 * 使用例:
 *   <SwipeableItem onDelete={() => handleDelete(item.id)}>
 *     <View style={styles.row}>
 *       <Text>{item.title}</Text>
 *     </View>
 *   </SwipeableItem>
 */
export const SwipeableItem: React.FC<SwipeableItemProps> = ({
  children,
  onDelete,
  deleteLabel = "削除",
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const { panResponder, swipeStyle } = useSwipeable(onDelete);

  return (
    <View style={{ width: screenWidth, overflow: "hidden" }}>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          { flexDirection: "row", width: screenWidth + DELETE_BG_WIDTH },
          swipeStyle,
        ]}
      >
        <View style={{ width: screenWidth }}>
          {children}
        </View>
        <View style={styles.deleteSection}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => {
              triggerHaptic("medium");
              onDelete();
            }}
            accessibilityLabel={deleteLabel}
            accessibilityRole="button"
          >
            <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
            <Text style={styles.deleteText}>{deleteLabel}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

export const SwipeableRow = SwipeableItem;

const styles = StyleSheet.create({
  deleteSection: {
    width: DELETE_BG_WIDTH,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButton: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  deleteText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
});
