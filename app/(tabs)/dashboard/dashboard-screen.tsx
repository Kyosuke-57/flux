import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, RefreshControl, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useAuth } from "../../../src/contexts/AuthContext";
import { useSettings } from "../../../src/contexts/SettingsContext";
import { theme, Spacing, BorderRadius, Shadows } from "../../../src/theme";
import { GlassCard } from "../../../src/components/Glass";
import { FadeInView, useHaptics } from "../../../src/animations";
import { HomeScreenSkeleton } from "../../../src/components/Skeleton";
import { getDashboardData } from "../../../src/services/dashboard";
import { StatsCard } from "./components/StatsCard";
import { RecentActivity } from "./components/RecentActivity";
import { QuickActions } from "./components/QuickActions";
import { EmptyState } from "./components/EmptyState";

function secondsToHms(s: number) {
  if (s === Infinity) return "∞";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

export default function DashboardScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const { settings } = useSettings();
  const c = theme(settings.isDarkMode);
  const haptics = useHaptics();

  const [data, setData] = useState<Awaited<ReturnType<typeof getDashboardData>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"date" | "name" | "status">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const fetchDashboard = useCallback(async () => {
    if (!user) {
      setData(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const result = await getDashboardData();
      setData(result);
      setError(null);
    } catch (e: any) {
      setError(e.message ?? "ダッシュボードの読み込みに失敗しました");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchDashboard();
    }
  }, [authLoading, fetchDashboard]);

  useFocusEffect(
    useCallback(() => {
      if (!authLoading && user) {
        fetchDashboard();
      }
    }, [authLoading, user, fetchDashboard]),
  );

  const recentActivity = data?.recentActivity ?? [];

  const filteredActivities = useMemo(() => {
    if (!searchQuery.trim()) return recentActivity;
    const q = searchQuery.toLowerCase();
    return recentActivity.filter((item) => {
      const nameMatch = item.title.toLowerCase().includes(q);
      const statusMatch = item.status?.toLowerCase().includes(q) ?? false;
      const typeMatch = item.type.toLowerCase().includes(q);
      return nameMatch || statusMatch || typeMatch;
    });
  }, [searchQuery, recentActivity]);

  const sortedActivities = useMemo(() => {
    const sorted = [...filteredActivities];
    const dir = sortDirection === "asc" ? 1 : -1;
    sorted.sort((a, b) => {
      switch (sortField) {
        case "date":
          return (new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) * dir;
        case "name":
          return a.title.localeCompare(b.title) * dir;
        case "status": {
          const sa = a.status ?? "";
          const sb = b.status ?? "";
          return sa.localeCompare(sb) * dir;
        }
        default:
          return 0;
      }
    });
    return sorted;
  }, [filteredActivities, sortField, sortDirection]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboard();
  }, [fetchDashboard]);

  // -------- Auth loading ----------
  if (authLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={["top", "left", "right"]}>
        <HomeScreenSkeleton />
      </SafeAreaView>
    );
  }

  // -------- Not logged in ----------
  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={["top", "left", "right"]}>
        <View style={styles.header} />
        <View style={styles.center}>
          <Text style={[styles.signInPrompt, { color: c.textSecondary }]}>サインインして始めよう</Text>
          <TouchableOpacity
            style={[styles.signInButton, { backgroundColor: c.primary }]}
            onPress={() => { haptics.mediumTap(); router.push("/(auth)/login"); }}
            activeOpacity={0.8}
          >
            <Text style={[styles.signInButtonText, { color: c.textInverse }]}>サインイン</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // -------- Main loading ----------
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={["top", "left", "right"]}>
        <HomeScreenSkeleton />
      </SafeAreaView>
    );
  }

  const usage = data?.usage;
  const stats = data?.stats;

  // -------- Empty state (logged in, loaded, no data) ----------
  const isEmpty = data != null
    && (stats?.totalMinutes ?? 0) === 0
    && (stats?.totalRecordings ?? 0) === 0
    && (stats?.totalFolders ?? 0) === 0
    && (stats?.totalTags ?? 0) === 0;

  if (isEmpty) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={["top", "left", "right"]}>
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} colors={[c.primary]} />
          }
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <FadeInView delay={0} style={styles.header}>
            <Text style={[styles.title, { color: c.textPrimary }]}>ダッシュボード</Text>
            <Text style={[styles.subtitle, { color: c.textSecondary }]}>アクティビティの概要</Text>
          </FadeInView>

          <EmptyState />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // -------- Main screen ----------
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={["top", "left", "right"]}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.primary}
            colors={[c.primary]}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <FadeInView delay={0} style={styles.header}>
          <Text style={[styles.title, { color: c.textPrimary }]}>ダッシュボード</Text>
          <Text style={[styles.subtitle, { color: c.textSecondary }]}>アクティビティの概要</Text>
        </FadeInView>

        {/* Search Bar */}
        <FadeInView delay={60}>
          <View style={[styles.searchContainer, { backgroundColor: c.inputBg, borderColor: c.border }]}>
            <Ionicons name="search" size={18} color={c.textMuted} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: c.textPrimary }]}
              placeholder="名前や内容でフィルタ..."
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
          {searchQuery.length > 0 && filteredActivities.length === 0 && (
            <Text style={[styles.searchEmptyText, { color: c.textSecondary }]}>
              一致するアクティビティがありません
            </Text>
          )}
        </FadeInView>

        {/* Section 1: Usage + Stats Grid */}
        <FadeInView delay={100}>
          {/* Usage bar */}
          {usage && (
            <GlassCard intensity={35} style={styles.usageBar}>
              <View style={styles.usageRow}>
                <Text style={[styles.usageText, { color: c.textSecondary }]}>
                  {usage.plan.charAt(0).toUpperCase() + usage.plan.slice(1)} プラン
                </Text>
                <Text style={[styles.usageText, { color: c.textSecondary }]}>
                  {secondsToHms(usage.usageSeconds)} /{" "}
                  {usage.limitSeconds === Infinity
                    ? "∞"
                    : secondsToHms(usage.limitSeconds)}
                </Text>
              </View>
              {usage.limitSeconds !== Infinity && usage.limitSeconds > 0 && (
                <View style={[styles.usageTrack, { backgroundColor: c.border }]}>
                  <View
                    style={[
                      styles.usageFill,
                      {
                        backgroundColor: c.primary,
                        width: `${Math.min(
                          100,
                          (usage.usageSeconds / usage.limitSeconds) * 100,
                        )}%`,
                      },
                    ]}
                  />
                </View>
              )}
            </GlassCard>
          )}
        </FadeInView>

        {/* Stats Cards Grid (2x2) */}
        {stats && (
          <FadeInView delay={200} style={styles.statsGrid}>
            <View style={styles.statsRow}>
              <View style={styles.statsHalf}>
                <StatsCard
                  title="議事録"
                  value={stats.totalMinutes}
                  icon="document-text"
                  color={c}
                />
              </View>
              <View style={styles.statsHalf}>
                <StatsCard
                  title="録音"
                  value={stats.totalRecordings}
                  icon="mic"
                  color={c}
                  accentColor={c.secondary}
                />
              </View>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statsHalf}>
                <StatsCard
                  title="フォルダ"
                  value={stats.totalFolders}
                  icon="folder"
                  color={c}
                  accentColor={c.info}
                />
              </View>
              <View style={styles.statsHalf}>
                <StatsCard
                  title="タグ"
                  value={stats.totalTags}
                  icon="pricetag"
                  color={c}
                  accentColor={c.warning}
                />
              </View>
            </View>
          </FadeInView>
        )}

        {/* Sort Controls */}
        <FadeInView delay={280}>
          <View style={styles.sortRow}>
            {/* Sort field buttons */}
            <View style={styles.sortFieldGroup}>
              {(["date", "name", "status"] as const).map((field) => (
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
                      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
                    } else {
                      setSortField(field);
                      setSortDirection(field === "date" ? "desc" : "asc");
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={
                      field === "date"
                        ? "calendar-outline"
                        : field === "name"
                          ? "text-outline"
                          : "flag-outline"
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
                          sortField === field ? c.primary : c.textSecondary,
                      },
                    ]}
                  >
                    {field === "date"
                      ? "日付"
                      : field === "name"
                        ? "名前"
                        : "ステータス"}
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

            {/* Direction toggle */}
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
                name={sortDirection === "asc" ? "arrow-up" : "arrow-down"}
                size={15}
                color={c.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </FadeInView>

        {/* Section 2: Recent Activity */}
        <FadeInView delay={300}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>最近のアクティビティ</Text>
          </View>
          <RecentActivity
            activities={sortedActivities}
            color={c}
            onPress={(id, type) => {
              haptics.lightTap();
              if (type === "minute") {
                router.push(`/minute/${id}`);
              } else if (type === "recording") {
                router.push(`/recording/${id}`);
              }
            }}
          />
        </FadeInView>

        {/* Section 3: Quick Actions */}
        <FadeInView delay={400}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>クイックアクション</Text>
          </View>
          <QuickActions
            color={c}
            onRecord={() => router.push("/record")}
            onViewMinutes={() => router.push("/(tabs)/minutes")}
            onNewFolder={() => router.push("/(tabs)/folders")}
            onSettings={() => router.push("/(tabs)/settings")}
          />
        </FadeInView>
      </ScrollView>

      {error && (
        <View style={[styles.errorBanner, { backgroundColor: c.errorBg, borderTopColor: c.error }]}>
          <Text style={[styles.errorText, { color: c.error }]}>{error}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scrollContent: { paddingBottom: 32 },

  /* Header */
  header: { paddingHorizontal: Spacing.xxl, paddingTop: Spacing.lg, paddingBottom: Spacing.sm },
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

  /* Usage bar */
  usageBar: {
    marginHorizontal: Spacing.xxl,
    marginTop: Spacing.md,
    padding: 14,
    borderRadius: BorderRadius.md,
  },
  usageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  usageText: { fontSize: 13, fontWeight: "500" },
  usageTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  usageFill: {
    height: "100%",
    borderRadius: 3,
  },

  /* Stats grid */
  statsGrid: {
    marginHorizontal: Spacing.xxl,
    marginTop: Spacing.md,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  statsHalf: {
    flex: 1,
    width: "48%" as const,
  },

  /* Section header */
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.xxl,
    marginTop: 28,
    marginBottom: Spacing.md,
  },
  sectionTitle: { fontSize: 18, fontWeight: "600" },

  /* Sign in */
  signInPrompt: { fontSize: 16, marginBottom: Spacing.lg },
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
