import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { RecordingState } from "../../../src/services/recording-types";
import type { ColorsLight } from "../../../src/theme";

type Props = {
  elapsed: number;
  recState: RecordingState;
  formatTime: (s: number) => string;
  color: typeof ColorsLight;
};

export function TimerDisplay({
  elapsed,
  recState,
  formatTime,
  color,
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={[styles.timer, { color: color.textPrimary }]}>
        {formatTime(elapsed)}
      </Text>

      {recState === "paused" && (
        <View style={[styles.badge, { backgroundColor: color.warningBg }]}>
          <Text style={[styles.badgeText, { color: color.warning }]}>
            一時停止中
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingBottom: 10,
  },
  timer: {
    fontSize: 48,
    fontWeight: "300",
    fontVariant: ["tabular-nums"],
    letterSpacing: 2,
  },
  badge: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
