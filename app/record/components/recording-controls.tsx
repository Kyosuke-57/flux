import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { RecordingState } from "../../../src/services/recording-types";
import type { ColorsLight } from "../../../src/theme";

type Props = {
  recState: RecordingState;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  color: typeof ColorsLight;
};

export function RecordingControls({
  recState,
  onPause,
  onResume,
  onStop,
  color,
}: Props) {
  return (
    <View
      style={[
        styles.controls,
        { backgroundColor: color.surface, borderTopColor: color.divider },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.controlButton,
          { backgroundColor: color.surfaceSecondary },
        ]}
        onPress={recState === "recording" ? onPause : onResume}
      >
        <Ionicons
          name={recState === "recording" ? "pause" : "play"}
          size={24}
          color={color.textPrimary}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.stopButton, { backgroundColor: color.error }]}
        onPress={onStop}
      >
        <View style={styles.stopIcon} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  controls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 28,
    paddingVertical: 20,
    paddingBottom: 28,
    borderTopWidth: 1,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  stopButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  stopIcon: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: "#fff",
  },
});
