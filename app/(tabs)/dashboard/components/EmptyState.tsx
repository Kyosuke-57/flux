import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { theme, Spacing } from "../../../../src/theme";
import { FadeInView, useHaptics } from "../../../../src/animations";
import { useSettings } from "../../../../src/contexts/SettingsContext";

export function EmptyState() {
  const { settings } = useSettings();
  const c = theme(settings.isDarkMode);
  const haptics = useHaptics();

  return (
    <FadeInView delay={120} style={styles.wrapper}>
      <View style={styles.illustration}>
        <View style={[styles.iconRing, { borderColor: c.primary + "30" }]}>
          <View style={[styles.iconCircle, { backgroundColor: c.primaryBg }]}>
            <Ionicons name="document-text-outline" size={48} color={c.primary} />
          </View>
        </View>
      </View>

      <Text style={[styles.title, { color: c.textPrimary }]}>まだデータがありません</Text>
      <Text style={[styles.description, { color: c.textSecondary }]}>
        最初の議事録を作成して、アクティビティを始めましょう。{'\n'}
        録音や文字起こしが自動的にここに表示されます。
      </Text>

      <TouchableOpacity
        style={[styles.ctaButton, { backgroundColor: c.primary }]}
        onPress={() => {
          haptics.mediumTap();
          router.push("/record");
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="mic" size={18} color={c.textInverse} style={styles.ctaIcon} />
        <Text style={[styles.ctaLabel, { color: c.textInverse }]}>最初の録音を始める</Text>
      </TouchableOpacity>
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xxxl,
    paddingTop: 48,
    paddingBottom: 32,
  },

  /* Illustration */
  illustration: {
    marginBottom: Spacing.xxl,
  },
  iconRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Text */
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 22,
    textAlign: "center",
    marginBottom: Spacing.xxl,
  },

  /* CTA */
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.xxl,
    paddingVertical: 14,
    borderRadius: 12,
  },
  ctaIcon: {
    marginRight: Spacing.sm,
  },
  ctaLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
});
