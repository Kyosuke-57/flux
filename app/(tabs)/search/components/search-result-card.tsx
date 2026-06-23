import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../../../../src/components/Glass";
import { HighlightedText } from "../../../../src/components/HighlightedText";
import type { SearchResultItem } from "../../../../src/services/search";
import type { ColorsLight } from "../../../../src/theme";

type Props = {
  item: SearchResultItem;
  search: string;
  onPress: (item: SearchResultItem) => void;
  color: typeof ColorsLight;
};

/** 検索結果の種類ごとのアイコンとラベル */
function typeMeta(type: SearchResultItem["type"]) {
  switch (type) {
    case "minute":
      return { icon: "document-text" as const, label: "議事録" };
    case "recording":
      return { icon: "mic" as const, label: "録音" };
    case "transcription_job":
      return { icon: "hammer" as const, label: "文字起こし" };
  }
}

export function SearchResultCard({ item, search, onPress, color }: Props) {
  const meta = typeMeta(item.type);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(item)}
      style={styles.cardWrapper}
    >
      <GlassCard intensity={25} style={styles.card}>
        <View style={styles.cardTop}>
          {/* 種別バッジ */}
          <View style={[styles.typeBadge, { backgroundColor: color.primaryBg }]}>
            <Ionicons name={meta.icon} size={13} color={color.primary} />
            <Text style={[styles.typeLabel, { color: color.primary }]}>
              {meta.label}
            </Text>
          </View>

          {/* 日付 */}
          <Text style={[styles.date, { color: color.textMuted }]}>
            {formatItemDate(item.created_at)}
          </Text>
        </View>

        {/* タイトル */}
        <HighlightedText
          text={item.title}
          highlight={search}
          style={{ ...styles.title, color: color.textPrimary }}
        />

        {/* サブタイトル / プレビュー */}
        <HighlightedText
          text={item.subtitle}
          highlight={search}
          style={{ ...styles.subtitle, color: color.textSecondary }}
          numberOfLines={2}
        />
      </GlassCard>
    </TouchableOpacity>
  );
}

function formatItemDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) {
    return d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) return "昨日";
  if (diffDays < 7) return `${diffDays}日前`;

  return d.toLocaleDateString("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "short",
    day: "numeric",
  });
}

const styles = StyleSheet.create({
  cardWrapper: {
    marginHorizontal: 24,
    marginBottom: 8,
  },
  card: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  date: {
    fontSize: 11,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 21,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
});
