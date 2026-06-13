import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../../../src/components/Glass";
import { theme, Spacing, BorderRadius, Shadows } from "../../../src/theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

interface QuickActionsProps {
  color: ReturnType<typeof theme>;
  onRecord?: () => void;
  onViewMinutes?: () => void;
  onNewFolder?: () => void;
  onSettings?: () => void;
}

interface ActionButtonProps {
  label: string;
  icon: IoniconName;
  color: ReturnType<typeof theme>;
  accentColor: string;
  onPress?: () => void;
}

function ActionButton({ label, icon, color: c, accentColor, onPress }: ActionButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.actionWrapper}
    >
      <GlassCard intensity={25} style={styles.actionCard}>
        <View style={[styles.actionIconCircle, { backgroundColor: accentColor + "18" }]}>
          <Ionicons name={icon} size={22} color={accentColor} />
        </View>
        <Text style={[styles.actionLabel, { color: c.textPrimary }]} numberOfLines={1}>
          {label}
        </Text>
      </GlassCard>
    </TouchableOpacity>
  );
}

export function QuickActions({
  color: c,
  onRecord,
  onViewMinutes,
  onNewFolder,
  onSettings,
}: QuickActionsProps) {
  return (
    <View style={styles.grid}>
      <ActionButton
        label="新規録音"
        icon="mic"
        color={c}
        accentColor={c.primary}
        onPress={onRecord}
      />
      <ActionButton
        label="議事録一覧"
        icon="document-text"
        color={c}
        accentColor={c.secondary}
        onPress={onViewMinutes}
      />
      <ActionButton
        label="新規フォルダ"
        icon="folder-open"
        color={c}
        accentColor={c.warning}
        onPress={onNewFolder}
      />
      <ActionButton
        label="設定"
        icon="settings"
        color={c}
        accentColor={c.info}
        onPress={onSettings}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -Spacing.sm,
  },
  actionWrapper: {
    width: "50%",
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  actionCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
    ...Shadows.sm,
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
});
