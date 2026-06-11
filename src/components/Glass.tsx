import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { useSettings } from "../contexts/SettingsContext";
import { theme, BorderRadius, Shadows } from "../theme";

interface GlassProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
}

export function Glass({ children, style }: GlassProps) {
  const { settings } = useSettings();
  const isDarkMode = settings.isDarkMode;
  const c = theme(isDarkMode);

  return (
    <View
      style={[
        styles.glass,
        {
          backgroundColor: isDarkMode ? "rgba(30,41,59,0.5)" : c.surface,
          borderColor: isDarkMode ? "rgba(255,255,255,0.06)" : c.borderLight,
          ...Shadows.glass,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function GlassCard({ children, style, intensity }: GlassCardProps) {
  const { settings } = useSettings();
  const isDarkMode = settings.isDarkMode;
  const c = theme(isDarkMode);

  return (
    <View
      style={[
        styles.glass,
        {
          backgroundColor: isDarkMode ? "rgba(30,41,59,0.5)" : c.surface,
          borderColor: isDarkMode ? "rgba(255,255,255,0.06)" : c.cardBorder,
          ...Shadows.glass,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  glass: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: 16,
  },
});
