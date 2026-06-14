import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../../../../src/components/Glass";
import { theme } from "../../../../src/theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

type ActivityType = "minute" | "recording" | "transcription";

interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  timestamp: string;
  status?: string;
}

interface RecentActivityProps {
  activities: Activity[];
  color: ReturnType<typeof theme>;
  onPress?: (id: string, type: string) => void;
}

function getActivityIcon(type: ActivityType): IoniconName {
  switch (type) {
    case "minute":
      return "document-text";
    case "recording":
      return "mic";
    case "transcription":
      return "hammer";
  }
}

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffMinutes < 1) return "たった今";
  if (diffMinutes < 60) return `${diffMinutes}分前`;
  if (diffHours < 24) return `${diffHours}時間前`;
  if (diffDays < 7) return `${diffDays}日前`;
  if (diffWeeks < 4) return `${diffWeeks}週間前`;

  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getStatusColor(status: string, c: ReturnType<typeof theme>): string {
  switch (status) {
    case "完了":
      return c.success;
    case "処理中":
    case "変換中":
      return c.warning;
    case "エラー":
      return c.error;
    default:
      return c.textMuted;
  }
}

export function RecentActivity({ activities, color: c, onPress }: RecentActivityProps) {
  const renderItem = ({ item }: { item: Activity }) => (
    <TouchableOpacity
      onPress={() => onPress?.(item.id, item.type)}
      activeOpacity={0.7}
      style={styles.itemWrapper}
    >
      <GlassCard intensity={25} style={styles.item}>
        <View style={styles.itemLeft}>
          <View style={[styles.itemIconBg, { backgroundColor: c.primaryBg }]}>
            <Ionicons name={getActivityIcon(item.type)} size={16} color={c.primary} />
          </View>
          <View style={styles.itemText}>
            <Text style={[styles.itemTitle, { color: c.textPrimary }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[styles.itemTime, { color: c.textMuted }]}>
              {getRelativeTime(item.timestamp)}
            </Text>
          </View>
        </View>
        {item.status ? (
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status, c) + "18" }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status, c) }]}>
              {item.status}
            </Text>
          </View>
        ) : null}
      </GlassCard>
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={activities}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      scrollEnabled={false}
      contentContainerStyle={styles.listContent}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 4,
  },
  itemWrapper: {
    marginBottom: 8,
  },
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  itemIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  itemText: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  itemTime: {
    fontSize: 11,
    fontWeight: "400",
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
});
