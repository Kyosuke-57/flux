import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ColorsLight } from "../../../../src/theme";

type Props = {
  color: typeof ColorsLight;
};

export function EmptyState({ color }: Props) {
  return (
    <View style={styles.centered}>
      <View style={[styles.iconCircle, { backgroundColor: color.primaryBg }]}>
        <Ionicons name="heart-outline" size={40} color={color.primary} />
      </View>
      <Text style={[styles.title, { color: color.textPrimary }]}>
        お気に入りはまだありません
      </Text>
      <Text style={[styles.subtext, { color: color.textSecondary }]}>
        議事録のハートアイコンをタップすると、ここに保存されます
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: { fontSize: 18, fontWeight: "600", textAlign: "center" },
  subtext: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
});
