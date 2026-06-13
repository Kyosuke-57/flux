import React, { useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "../../../src/contexts/AuthContext";
import { useSettings } from "../../../src/contexts/SettingsContext";
import { theme, Spacing, BorderRadius } from "../../../src/theme";
import { GlassCard } from "../../../src/components/Glass";
import { useCalendar, formatDateLabel, formatMinuteTime } from "./hooks/use-calendar";
import { CalendarGrid } from "./components/calendar-grid";
import type { Minute } from "../../../src/types";

function MinuteListItem({
  item,
  color,
}: {
  item: Minute;
  color: ReturnType<typeof theme>;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => router.push(`/minute/${item.id}`)}
    >
      <GlassCard intensity={25} style={styles.minuteCard}>
        <View style={styles.minuteCardTop}>
          <Text
            style={[styles.minuteTime, { color: color.primary }]}
          >
            {formatMinuteTime(item.created_at)}
          </Text>
          {item.tags && item.tags.length > 0 && (
            <View style={[styles.tagBadge, { backgroundColor: color.primaryBg }]}>
              <Text style={[styles.tagBadgeText, { color: color.primary }]}>
                {item.tags.length}
              </Text>
            </View>
          )}
        </View>
        <Text
          style={[styles.minuteTitle, { color: color.textPrimary }]}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        <Text
          style={[styles.minutePreview, { color: color.textSecondary }]}
          numberOfLines={2}
        >
          {item.content.replace(/[#*`\[\]]/g, "").trim()}
        </Text>
      </GlassCard>
    </TouchableOpacity>
  );
}

export default function CalendarScreen() {
  const { settings } = useSettings();
  const c = theme(settings.isDarkMode);
  const { user } = useAuth();

  const {
    weeks,
    selectedDateKey,
    selectedMinutes,
    monthLabel,
    loading,
    refreshing,
    goToPrevMonth,
    goToNextMonth,
    goToToday,
    handleSelectDate,
    onRefresh,
  } = useCalendar();

  // ── 未認証 ──
  if (!user) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: c.background }]}
        edges={["top", "left", "right"]}
      >
        <View style={styles.center}>
          <Text style={[styles.emptyTitle, { color: c.textPrimary }]}>
            サインインしてください
          </Text>
          <Text style={[styles.emptySubtext, { color: c.textSecondary }]}>
            カレンダーの表示にはログインが必要です。
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: c.background }]}
      edges={["top", "left", "right"]}
    >
      <FlatList
        data={selectedMinutes}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.primary}
            colors={[c.primary]}
          />
        }
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {/* ── 月ナビゲーションヘッダー ── */}
            <View style={styles.monthNav}>
              <TouchableOpacity
                onPress={goToPrevMonth}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="chevron-back" size={24} color={c.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={goToToday}>
                <Text style={[styles.monthLabel, { color: c.textPrimary }]}>
                  {monthLabel}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={goToNextMonth}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="chevron-forward" size={24} color={c.primary} />
              </TouchableOpacity>
            </View>

            {/* ── カレンダーグリッド ── */}
            <CalendarGrid
              weeks={weeks}
              selectedDateKey={selectedDateKey}
              onSelectDate={handleSelectDate}
              color={c}
            />

            {/* ── 選択日ラベル ── */}
            {selectedDateKey && (
              <View style={styles.selectedDateSection}>
                <Text style={[styles.selectedDateLabel, { color: c.textSecondary }]}>
                  {formatDateLabel(selectedDateKey)}
                </Text>
                <Text style={[styles.minuteCount, { color: c.textMuted }]}>
                  {selectedMinutes.length} 件
                </Text>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          selectedDateKey && !loading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={32} color={c.textMuted} />
              <Text style={[styles.emptySubtext, { color: c.textSecondary }]}>
                この日の議事録はありません
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <MinuteListItem item={item} color={c} />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  listContent: { paddingBottom: 32 },

  /* 月ナビゲーション */
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: "700",
  },

  /* 選択日 */
  selectedDateSection: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    marginTop: 20,
    marginBottom: 8,
  },
  selectedDateLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  minuteCount: {
    fontSize: 12,
  },

  /* 空状態 */
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 32,
    gap: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: "600", textAlign: "center" },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },

  /* ミニッツカード */
  minuteCard: {
    marginHorizontal: 24,
    marginTop: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.md,
  },
  minuteCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  minuteTime: {
    fontSize: 12,
    fontWeight: "600",
  },
  minuteTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 2,
  },
  minutePreview: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  tagBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  tagBadgeText: { fontSize: 10, fontWeight: "500" },
});
