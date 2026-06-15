import React, { type ReactNode } from "react";
import { View, Text, TouchableOpacity, StyleSheet, type ViewStyle } from "react-native";
import type { ColorsLight } from "../theme";

type Props = {
  title: string;
  subtext: string;
  actionLabel?: string;
  onAction?: () => void;
  color: typeof ColorsLight;
  /** Optional content rendered above the title (e.g. icon) */
  topContent?: ReactNode;
  /** Wrapper style override */
  style?: ViewStyle;
};

/**
 * 共通 EmptyState コンポーネント
 * 中央揃えのタイトル＋サブテキスト＋任意のアクションボタン
 */
export function EmptyState({
  title,
  subtext,
  actionLabel,
  onAction,
  color,
  topContent,
  style,
}: Props) {
  return (
    <View style={[styles.centered, style]}>
      {topContent}
      <Text style={[styles.title, { color: color.textPrimary }]}>{title}</Text>
      <Text style={[styles.subtext, { color: color.textSecondary }]}>{subtext}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: color.primary }]}
          onPress={onAction}
          activeOpacity={0.8}
        >
          <Text style={[styles.actionButtonText, { color: color.textInverse }]}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      )}
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
  title: { fontSize: 18, fontWeight: "600", textAlign: "center" },
  subtext: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  actionButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionButtonText: { fontWeight: "600", fontSize: 15 },
});
