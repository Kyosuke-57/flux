import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SwipeableRow } from "../../../../src/animations/gestures";
import { GlassCard } from "../../../../src/components/Glass";
import { Spacing, BorderRadius } from "../../../../src/theme";
import type { Folder } from "../../../../src/types";
import type { ColorsLight } from "../../../../src/theme";

type Props = {
  folder: Folder;
  onPress: () => void;
  onDelete: () => void;
  color: typeof ColorsLight;
};

export function FolderCard({ folder, onPress, onDelete, color }: Props) {
  return (
    <SwipeableRow onDelete={onDelete}>
      <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
        <GlassCard intensity={25} style={styles.card}>
          <View style={styles.row}>
            {/* カラーインジケーター */}
            <View
              style={[
                styles.colorDot,
                {
                  backgroundColor: folder.color ?? color.primary,
                  borderColor: folder.color ?? color.primary,
                },
              ]}
            />
            {/* フォルダ名 */}
            <Text
              style={[styles.name, { color: color.textPrimary }]}
              numberOfLines={1}
            >
              {folder.name}
            </Text>
            {/* 矢印 */}
            <Ionicons name="chevron-forward" size={18} color={color.textMuted} />
          </View>
        </GlassCard>
      </TouchableOpacity>
    </SwipeableRow>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 24,
    marginTop: 8,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
});
