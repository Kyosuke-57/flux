import React from "react";
import { View, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Spacing, BorderRadius } from "../../../../src/theme";
import type { ColorsLight } from "../../../../src/theme";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  color: typeof ColorsLight;
};

export function SearchBar({ value, onChangeText, color }: Props) {
  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: color.surface,
            borderColor: color.border,
          },
        ]}
      >
        <Ionicons name="search" size={16} color={color.textMuted} />
        <TextInput
          style={[styles.input, { color: color.textPrimary }]}
          value={value}
          onChangeText={onChangeText}
          placeholder="名前または内容で検索..."
          placeholderTextColor={color.textMuted}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {value.length > 0 && (
          <TouchableOpacity
            onPress={() => onChangeText("")}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={16} color={color.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 4,
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    height: 40,
  },
  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
});
