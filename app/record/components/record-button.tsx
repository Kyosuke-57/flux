import React from "react";
import { View, TouchableOpacity, Animated, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ColorsLight } from "../../../src/theme";

type Props = {
  onRecord: () => void;
  disabled: boolean;
  glowAnim: Animated.Value;
  glowOpacity: Animated.AnimatedInterpolation<number>;
  onPressIn: () => void;
  onPressOut: () => void;
  color: typeof ColorsLight;
};

export function RecordButton({
  onRecord,
  disabled,
  glowAnim,
  glowOpacity,
  onPressIn,
  onPressOut,
  color,
}: Props) {
  return (
    <View style={styles.wrapper}>
      <Animated.View
        style={[
          styles.glowRing,
          {
            backgroundColor: color.primary,
            opacity: glowOpacity,
          },
        ]}
      />
      <TouchableOpacity
        style={[
          styles.outer,
          { backgroundColor: color.primaryBg },
          disabled && styles.disabled,
        ]}
        onPress={onRecord}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <View style={[styles.inner, { backgroundColor: color.primary }]}>
          <Ionicons name="mic" size={36} color="#fff" />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
    width: 140,
    height: 140,
  },
  glowRing: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  outer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  inner: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  disabled: {
    opacity: 0.5,
  },
});
