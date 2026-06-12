import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FadeInView } from "../../../src/animations";
import { BorderRadius } from "../../../src/theme";
import type { ColorsLight } from "../../../src/theme";

type Props = {
  onImport: () => void;
  disabled: boolean;
  onPressIn?: () => void;
  haptics: { lightTap: () => void };
  color: typeof ColorsLight;
};

export function ImportButton({
  onImport,
  disabled,
  onPressIn,
  haptics,
  color,
}: Props) {
  return (
    <FadeInView delay={400}>
      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: color.surface, borderColor: color.border },
        ]}
        onPress={() => {
          haptics.lightTap();
          onImport();
        }}
        onPressIn={onPressIn}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Ionicons
          name="folder-open-outline"
          size={20}
          color={color.textSecondary}
        />
        <Text style={[styles.text, { color: color.textSecondary }]}>
          ファイルをインポート
        </Text>
      </TouchableOpacity>
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 32,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  text: {
    fontSize: 14,
    fontWeight: "500",
  },
});
