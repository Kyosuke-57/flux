import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  RefreshControl, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { useAuth } from "../../../src/contexts/AuthContext";
import { useSettings } from "../../../src/contexts/SettingsContext";
import { theme, Spacing, BorderRadius, Shadows } from "../../../src/theme";
import { GlassCard } from "../../../src/components/Glass";
import { FadeInView, useHaptics } from "../../../src/animations";
import { HomeScreenSkeleton } from "../../../src/components/Skeleton";
import {
  getAllActivities,
  filterActivities,
  sortActivities,
  getActivityLabel,
  getActivityStatusLabel,
  type ActivityItem,
  type ActivityType,
  type HistorySortField,
  type HistorySortDirection,
} from "../../../src/services/history";

// ─── 相対時刻 ────────────────────────────────────────────

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
  if (diffWeeks < 52) return `${diffWeeks}週間前`;

  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
}

// ─── 日付グループ化用 ─────────────────────────────────────

function getDateGroup(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor(
    (today.getTime() - target.getTime()) / 86400000,
  );

  if (diffDays === 0) return "今日";
  if (diffDays === 1) return "昨日";
  if (diffDays < 7) return `${diffDays}日前`;

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
}

// ─── アイコン名解決 ───────────────────────────────────────

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

function getActivityIcon(type: ActivityType): IoniconName {
  switch (type) {
    case "minute_created":
      return "document-text";
    case "minute_edited":
      return "create";
    case "recording_uploaded":
      return "mic";
    case "transcription_job":
      return "hammer";
    case "exported":
      return "share";
  }
}

function getStatusColor(status: string | undefined, c: ReturnType<typeof theme>): string {
  switch (status) {
    case "completed":
    case "transcribed":
      return c.success;
    case "processing":
    case "queued":
      return c.warning;
    case "failed":
      return c.error;
    default:
      return c.textMuted;
  }
}

// ─── アクティビティカード ─────────────────────────────────

function ActivityCard({
  item,
  color: c,
  onPress,
}: {
  item: ActivityItem;
  color: ReturnType<typeof theme>;
  onPress: (item: ActivityItem) => void;
}) {
  const statusLabel = getActivityStatusLabel(item.status);
  const statusColor = getStatusColor(item.status, c);

  return (
    <TouchableOpacity
      onPress={() => onPress(item)}
      activeOpacity={0.7}
      style={styles.cardWrapper}
    >
      <GlassCard intensity={25} style={styles.card}>
        <View style={styles.cardLeft}>
          <View style={[styles.cardIconBg, { backgroundColor: c.primaryBg }]}>
            <Ionicons
              name={getActivityIcon(item.type)}
              size={16}
              color={c.primary}
            />
          </View>
          <View style={styles.cardText}>
            <Text
              style={[styles.cardTitle, { color: c.textPrimary }]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text style={[styles.cardDesc, { color: c.textMuted }]} numberOfLines={1}>
              {getActivityLabel(item.type)}
              {" ・ "}
              {getRelativeTime(item.timestamp)}
            </Text>
          </View>
        </View>
        {item.status ? (
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColor + "18" },
            ]}
          >
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
        )}
      </GlassCard>
    </TouchableOpacity>
  );
}

// ─── セクションヘッダー ───────────────────────────────────

function SectionHeader({
  title,
  color: c,
}: {
  title: string;
  color: ReturnType<typeof theme>;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionHeaderText, { color: c.textSecondary }]}>
        {title}
      </Text>
    </View>
  );
}

// ─── 空状態 ───────────────────────────────────────────────

function EmptyStateView({ color: c }: { color: ReturnType<typeof theme> }) {
  return (
    <View style={styles.emptyContainer}>
      <Ionicons name="time-outline" size={48} color={c.textMuted} />
      <Text style={[styles.emptyTitle, { color: c.textPrimary }]}>
        アクティビティがありません
      </Text>
      <Text style={[styles.emptySubtext, { color: c.textSecondary }]}>
        議事録の作成や録音のアップロードをすると、ここに履歴が表示されます。
      </Text>
    </View>
  );
}

// ─── 未認証ビュー ─────────────────────────────────────────

function UnauthenticatedView({ color: c }: { color: ReturnType<typeof theme> }) {
  const haptics = useHaptics();
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: c.background }]}
      edges={["top", "left", "right"]}
    >
      <View style={styles.center}>
        <Text style={[styles.signInPrompt, { color: c.textSecondary }]}>
          サインインして履歴を確認
        </Text>
        <TouchableOpacity
          style={[styles.signInButton, { backgroundColor: c.primary }]}
          onPress={() => {
            haptics.mediumTap();
            router.push("/(auth)/login");
          }}
          activeOpacity={0.8}
        >
          <Text style={[styles.signInButtonText, { color: c.textInverse }]}>
            サインイン
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── メイン画面 ───────────────────────────────────────────

export default function HistoryScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const { settings } = useSettings();
  const c = theme(settings.isDarkMode);
  const haptics = useHaptics();

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<HistorySortField>("date");
  const [sortDirection, setSortDirection] = useState<HistorySortDirection>("desc");

  // ── データ取得 ──
  const fetchActivities = useCallback(async () => {
    if (!user) {
      setActivities([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const result = await getAllActivities();
      if (result.error) {
        setError(result.error.message ?? "履歴の読み込みに失敗しました");
        setActivities([]);
      } else {
        setActivities(result.data ?? []);
        setError(null);
      }
    } catch (e: any) {
      setError(e.message ?? "予期しないエラーが発生しました");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) fetchActivities();
  }, [authLoading, fetchActivities]);

  useFocusEffect(
    useCallback(() => {
      if (!authLoading && user) fetchActivities();
    }, [authLoading, user, fetchActivities]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchActivities();
  }, [fetchActivities]);

  // ── フィルタ・ソート ──
  const processedActivities = useMemo(() => {
    const filtered = filterActivities(activities, searchQuery);
    return sortActivities(filtered, sortField, sortDirection);
  }, [activities, searchQuery, sortField, sortDirection]);

  // ── 日付グループ化 ──
  const groupedActivities = useMemo(() => {
    const groups = new Map<string, ActivityItem[]>();
    for (const item of processedActivities) {
      const group = getDateGroup(item.timestamp);
      const list = groups.get(group) ?? [];
      list.push(item);
      groups.set(group, list);
    }
    // カスタム順序: 今日 > 昨日 > 日付降順
    const order = ["今日", "昨日"];
    return Array.from(groups.entries()).sort(([a], [b]) => {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return b.localeCompare(a); // 日付文字列降順
    });
  }, [processedActivities]);

  const isEmpty = activities.length === 0 && !loading;

  // ── タップハンドラ ──
  const handlePress = useCallback(
    (item: ActivityItem) => {
      haptics.lightTap();
      router.push(item.targetRoute as any);
    },
    [haptics],
  );

  // ── ローディング ──
  if (authLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: c.background }]}
        edges={["top", "left", "right"]}
      >
        <HomeScreenSkeleton />
      </SafeAreaView>
    );
  }

  // ── 未認証 ──
  if (!user) {
    return <UnauthenticatedView color={c} />;
  }

  // ── メイン画面 ──
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: c.background }]}
      edges={["top", "left", "right"]}
    >
      <FlatList
        data={groupedActivities}
        keyExtractor={([group]) => group}
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
            {/* ヘッダー */}
            <FadeInView delay={0} style={styles.header}>
              <Text style={[styles.title, { color: c.textPrimary }]}>履歴</Text>
              <Text style={[styles.subtitle, { color: c.textSecondary }]}>
                最近のアクティビティ
              </Text>
            </FadeInView>

            {/* 検索バー */}
            <FadeInView delay={60}>
              <View
                style={[
                  styles.searchContainer,
                  { backgroundColor: c.inputBg, borderColor: c.border },
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
                  placeholder="名前や種類でフィルタ..."
                  placeholderTextColor={c.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                  clearButtonMode="while-editing"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchQuery("")}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.searchClear}
                  >
                    <Ionicons name="close-circle" size={18} color={c.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
              {searchQuery.length > 0 && processedActivities.length === 0 && (
                <Text
                  style={[styles.searchEmptyText, { color: c.textSecondary }]}
                >
                  一致するアクティビティがありません
                </Text>
              )}
            </FadeInView>

            {/* ソートコントロール */}
            <FadeInView delay={120}>
              <View style={styles.sortRow}>
                <View style={styles.sortFieldGroup}>
                  {(["date", "type", "title"] as const).map((field) => (
                    <TouchableOpacity
                      key={field}
                      style={[
                        styles.sortFieldButton,
                        sortField === field && {
                          backgroundColor: c.primary + "18",
                          borderColor: c.primary,
                        },
                        { borderColor: c.border },
                      ]}
                      onPress={() => {
                        haptics.lightTap();
                        if (sortField === field) {
                          setSortDirection((d) =>
                            d === "asc" ? "desc" : "asc",
                          );
                        } else {
                          setSortField(field);
                          setSortDirection(
                            field === "date" ? "desc" : "asc",
                          );
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={
                          field === "date"
                            ? "calendar-outline"
                            : field === "type"
                              ? "list-outline"
                              : "text-outline"
                        }
                        size={13}
                        color={
                          sortField === field ? c.primary : c.textMuted
                        }
                        style={styles.sortFieldIcon}
                      />
                      <Text
                        style={[
                          styles.sortFieldLabel,
                          {
                            color:
                              sortField === field
                                ? c.primary
                                : c.textSecondary,
                          },
                        ]}
                      >
                        {field === "date"
                          ? "日付"
                          : field === "type"
                            ? "種類"
                            : "名前"}
                      </Text>
                      {sortField === field && (
                        <Ionicons
                          name={
                            sortDirection === "asc"
                              ? "chevron-up"
                              : "chevron-down"
                          }
                          size={12}
                          color={c.primary}
                          style={styles.sortFieldChevron}
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.sortDirButton, { borderColor: c.border }]}
                  onPress={() => {
                    haptics.lightTap();
                    setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
                  }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={
                      sortDirection === "asc" ? "arrow-up" : "arrow-down"
                    }
                    size={15}
                    color={c.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </FadeInView>
          </>
        }
        ListEmptyComponent={
          isEmpty ? <EmptyStateView color={c} /> : null
        }
        renderItem={({ item: [group, items], index: sectionIndex }) => (
          <FadeInView delay={150 + sectionIndex * 40}>
            <SectionHeader title={group} color={c} />
            {items.map((activity) => (
              <ActivityCard
                key={activity.id}
                item={activity}
                color={c}
                onPress={handlePress}
              />
            ))}
          </FadeInView>
        )}
      />

      {/* エラーバナー */}
      {error && (
        <View
          style={[
            styles.errorBanner,
            { backgroundColor: c.errorBg, borderTopColor: c.error },
          ]}
        >
          <Text style={[styles.errorText, { color: c.error }]}>{error}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── スタイル ─────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { paddingBottom: 32 },

  /* Header */
  header: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  title: { fontSize: 32, fontWeight: "700" },
  subtitle: { fontSize: 14, marginTop: Spacing.xs },

  /* Search bar */
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.xxl,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  searchIcon: { marginRight: Spacing.sm },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  searchClear: { marginLeft: Spacing.sm },
  searchEmptyText: {
    fontSize: 14,
    textAlign: "center",
    marginTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },

  /* Sort controls */
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xxl,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  sortFieldGroup: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  sortFieldButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  sortFieldIcon: {
    marginRight: 4,
  },
  sortFieldLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  sortFieldChevron: {
    marginLeft: 2,
  },
  sortDirButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Section header */
  sectionHeader: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
  },

  /* Card */
  cardWrapper: {
    marginHorizontal: Spacing.xxl,
    marginBottom: Spacing.sm,
  },
  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.md,
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  cardIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  cardDesc: {
    fontSize: 11,
    fontWeight: "400",
    marginTop: 2,
  },

  /* Status badge */
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },

  /* Empty state */
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 64,
    paddingHorizontal: Spacing.xxxl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: Spacing.lg,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    marginTop: Spacing.sm,
    lineHeight: 20,
  },

  /* Sign in */
  signInPrompt: {
    fontSize: 16,
    marginBottom: Spacing.lg,
  },
  signInButton: {
    paddingHorizontal: Spacing.xxxl,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    ...Shadows.sm,
  },
  signInButtonText: { fontSize: 16, fontWeight: "700" },

  /* Error banner */
  errorBanner: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
    borderTopWidth: 1,
  },
  errorText: { fontSize: 13, textAlign: "center" },
});
