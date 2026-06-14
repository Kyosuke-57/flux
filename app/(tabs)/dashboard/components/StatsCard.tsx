import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../../../../src/components/Glass";
import { theme } from "../../../../src/theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: IoniconName;
  color: ReturnType<typeof theme>;
  accentColor?: string;
}

export function StatsCard({ title, value, icon, color: c, accentColor = c.primary }: StatsCardProps) {
  return (
    <GlassCard intensity={30} style={styles.card}>
      <View style={styles.iconRow}>
        <View style={[styles.iconCircle, { backgroundColor: c.primaryBg }]}>
          <Ionicons name={icon} size={18} color={accentColor} />
        </View>
      </View>
      <Text style={[styles.title, { color: c.textMuted }]} numberOfLines={1}>
        {title}
      </Text>
      <Text style={[styles.value, { color: c.textPrimary }]} numberOfLines={1}>
        {value}
      </Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    alignItems: "flex-start",
  },
  iconRow: {
    marginBottom: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
  },
  value: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
});
