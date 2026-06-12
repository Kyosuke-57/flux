import React from "react";
import { View, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ColorsLight } from "../../../../src/theme";

type Props = {
  search: string;
  onSearchChange: (text: string) => void;
  color: typeof ColorsLight;
};

export function SearchBar({ search, onSearchChange, color }: Props) {
  return (
    <View style={[styles.wrapper, { backgroundColor: color.surface, borderColor: color.border }]}>
      <Ionicons name="search" size={18} color={color.textMuted} />
      <TextInput
        style={[styles.input, { color: color.textPrimary }]}
        placeholder="検索…"
        placeholderTextColor={color.textMuted}
        value={search}
        onChangeText={onSearchChange}
      />
      {search ? (
        <TouchableOpacity onPress={() => onSearchChange("")}>
          <Ionicons name="close-circle" size={18} color={color.textMuted} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 24,
    marginTop: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
  },
});
