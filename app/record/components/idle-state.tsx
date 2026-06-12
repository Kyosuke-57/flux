import React from "react";
import { View, Text, Animated, StyleSheet } from "react-native";
import { BounceInView } from "../../../src/animations";
import { RecordButton } from "./record-button";
import { ImportButton } from "./import-button";
import type { ColorsLight } from "../../../src/theme";

type Props = {
  onRecord: () => void;
  onImport: () => void;
  disabled: boolean;
  glowAnim: Animated.Value;
  glowOpacity: Animated.AnimatedInterpolation<number>;
  onPressIn: () => void;
  onPressOut: () => void;
  haptics: { lightTap: () => void };
  color: typeof ColorsLight;
};

export function IdleState({
  onRecord,
  onImport,
  disabled,
  glowAnim,
  glowOpacity,
  onPressIn,
  onPressOut,
  haptics,
  color,
}: Props) {
  return (
    <BounceInView delay={0} style={styles.container}>
      <View style={styles.recordButtonWrapper}>
        <RecordButton
          onRecord={onRecord}
          disabled={disabled}
          glowAnim={glowAnim}
          glowOpacity={glowOpacity}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          color={color}
        />
      </View>
      <Text style={[styles.tapText, { color: color.textPrimary }]}>
        タップして録音
      </Text>
      <Text style={[styles.subtext, { color: color.textMuted }]}>
        または音声ファイルをインポート
      </Text>

      <ImportButton
        onImport={onImport}
        disabled={disabled}
        haptics={haptics}
        color={color}
      />
    </BounceInView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  recordButtonWrapper: {
    alignItems: "center",
    justifyContent: "center",
    width: 140,
    height: 140,
  },
  tapText: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 20,
  },
  subtext: {
    fontSize: 13,
    marginTop: 6,
  },
});
