import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  RefreshControl,
  TextInput,
} from "react-native";
import { useThemeColors } from "../../../src/hooks/useThemeColors";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "../../../src/contexts/AuthContext";
import { Spacing, BorderRadius } from "../../../src/theme";
import { GlassCard } from "../../../src/components/Glass";
import { useCalendar, formatDateLabel, formatMinuteTime } from "./hooks/use-calendar";
import { CalendarGrid } from "./components/calendar-grid";
import type { Minute } from "../../../src/types";

function MinuteListItem({
  item,
  color,
}: {
  item: Minute;
  color: ReturnType<typeof useThemeColors>;
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
  const c = useThemeColors();
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

  // ── 検索 ──
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMinutes = useMemo(() => {
    if (!searchQuery.trim()) return selectedMinutes;
    const q = searchQuery.trim().toLowerCase();
    return selectedMinutes.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.content.toLowerCase().includes(q),
    );
  }, [selectedMinutes, searchQuery]);

  // ── ソート ──
  type SortBy = "date" | "name" | "status";
  type SortDirection = "asc" | "desc";

  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const toggleSortDirection = useCallback(() => {
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
  }, []);

  const sortedMinutes = useMemo(() => {
    const sorted = [...filteredMinutes];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case "date":
          cmp =
            new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime();
          break;
        case "name":
          cmp = a.title.localeCompare(b.title);
          break;
        case "status":
          cmp = (a.tags?.length ?? 0) - (b.tags?.length ?? 0);
          break;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [filteredMinutes, sortBy, sortDirection]);

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
        data={sortedMinutes}
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

            {/* ── 検索バー ── */}
            <View
              style={[
                styles.searchContainer,
                { backgroundColor: c.surface, borderColor: c.border },
              ]}
            >
              <Ionicons
                name="search"
                size={18}
                color={c.textMuted}
                style={styles.searchIcon}
              />
              <TextInput
                style={[styles.searchInput, { color: c.textPrimary }]}
                placeholder="タイトルまたは内容で検索"
                placeholderTextColor={c.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery("")}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={c.textMuted}
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* ── ソートコントロール ── */}
            <View style={styles.sortContainer}>
              <View style={styles.sortChips}>
                {(
                  [
                    { key: "date", label: "日付" },
                    { key: "name", label: "名前" },
                    { key: "status", label: "ステータス" },
                  ] as const
                ).map((opt) => (
                  <TouchableOpacity
                    key={opt.key}
                    activeOpacity={0.7}
                    onPress={() => setSortBy(opt.key)}
                    style={[
                      styles.sortChip,
                      {
                        backgroundColor:
                          sortBy === opt.key ? c.primary : c.surface,
                        borderColor:
                          sortBy === opt.key ? c.primary : c.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.sortChipText,
                        {
                          color:
                            sortBy === opt.key ? "#fff" : c.textSecondary,
                        },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={toggleSortDirection}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[
                  styles.sortDirButton,
                  { backgroundColor: c.surface, borderColor: c.border },
                ]}
              >
                <Ionicons
                  name={
                    sortDirection === "asc"
                      ? "arrow-up"
                      : "arrow-down"
                  }
                  size={16}
                  color={c.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {/* ── 選択日ラベル ── */}
            {selectedDateKey && (
              <View style={styles.selectedDateSection}>
                <Text style={[styles.selectedDateLabel, { color: c.textSecondary }]}>
                  {formatDateLabel(selectedDateKey)}
                </Text>
                <Text style={[styles.minuteCount, { color: c.textMuted }]}>
                  {sortedMinutes.length} 件
                </Text>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          selectedDateKey && !loading ? (
            <View style={styles.emptyContainer}>
              <Ionicons
                name={searchQuery ? "search-outline" : "calendar-outline"}
                size={32}
                color={c.textMuted}
              />
              <Text style={[styles.emptySubtext, { color: c.textSecondary }]}>
                {searchQuery
                  ? "検索条件に一致する議事録がありません"
                  : "この日の議事録はありません"}
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

  /* 検索バー */
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 24,
    marginTop: 12,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },

  /* ソートコントロール */
  sortContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    marginTop: 16,
  },
  sortChips: {
    flexDirection: "row",
    gap: 8,
  },
  sortChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  sortChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  sortDirButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
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
