import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ColorsLight } from "../../../../src/theme";

type Props = {
  title: string;
  folderId: string | null;
  count: number;
  color: typeof ColorsLight;
};

export function SectionHeader({ title, folderId, count, color }: Props) {
  return (
    <View style={[styles.header, { borderBottomColor: color.divider }]}>
      <Ionicons
        name={folderId ? "folder" : "folder-open-outline"}
        size={14}
        color={color.textMuted}
      />
      <Text style={[styles.title, { color: color.textMuted }]}>{title}</Text>
      <View style={[styles.badge, { backgroundColor: color.surfaceSecondary }]}>
        <Text style={[styles.count, { color: color.textSecondary }]}>
          {count}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 24,
    paddingVertical: 8,
    marginTop: 6,
    borderBottomWidth: 1,
  },
  title: { fontSize: 12, fontWeight: "600", letterSpacing: 0.3 },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  count: { fontSize: 11, fontWeight: "600" },
});
