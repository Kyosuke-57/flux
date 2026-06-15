import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { EmptyState as CommonEmptyState } from "../../../../src/components/EmptyState";
import type { ColorsLight } from "../../../../src/theme";

type Props = {
  color: typeof ColorsLight;
};

export function EmptyState({ color }: Props) {
  return (
    <CommonEmptyState
      title="お気に入りはまだありません"
      subtext="議事録のハートアイコンをタップすると、ここに保存されます"
      color={color}
      topContent={
        <View style={[styles.iconCircle, { backgroundColor: color.primaryBg }]}>
          <Ionicons name="heart-outline" size={40} color={color.primary} />
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
});
