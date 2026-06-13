import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ColorsLight } from "../../../../src/theme";

type Props = {
  onRecord?: () => void;
  color: typeof ColorsLight;
};

export function EmptyState({ onRecord, color }: Props) {
  return (
    <View style={styles.container}>
      <Ionicons name="mic-outline" size={64} color={color.textMuted} />
      <Text style={[styles.title, { color: color.textPrimary }]}>
        録音データがありません
      </Text>
      <Text style={[styles.subtext, { color: color.textSecondary }]}>
        録音を開始すると、録音データがここに表示されます。
      </Text>
      {onRecord && (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: color.primary }]}
          onPress={onRecord}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.buttonText}>録音を開始</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
  },
  subtext: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
});
