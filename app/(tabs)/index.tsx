import { useEffect, useState, useCallback } from "react";
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  RefreshControl, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../src/contexts/AuthContext";
import { getAllMinutes } from "../../src/services/minutes";
import { getSubscriptionStatus } from "../../src/services/subscription";
import type { Minute } from "../../src/types";
import { Colors, Spacing, BorderRadius, Shadows, theme } from "../../src/theme";
import { useBounce, useHaptics, FadeInView, BounceInView } from "../../src/animations";
import { useSettings } from "../../src/contexts/SettingsContext";
import { HomeScreenSkeleton } from "../../src/components/Skeleton";
import { GlassCard } from "../../src/components/Glass";

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function secondsToHms(s: number) {
  if (s === Infinity) return "∞";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

export default function HomeScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const { settings } = useSettings();
  const c = theme(settings.isDarkMode);
  const haptics = useHaptics();
  const recordBtn = useBounce({ scaleIn: 0.95 });

  const [minutes, setMinutes] = useState<Minute[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [usage, setUsage] = useState<{
    plan: string;
    usageSeconds: number;
    limitSeconds: number;
  } | null>(null);

  const fetchMinutes = useCallback(async () => {
    if (!user) {
      setMinutes([]);
      setUsage(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const [minRes, subRes] = await Promise.all([
        getAllMinutes(),
        getSubscriptionStatus(),
      ]);
      if (minRes.error) {
        setError(minRes.error.message ?? "議事録の読み込みに失敗しました");
        setMinutes([]);
      } else {
        setMinutes(minRes.data ?? []);
        setError(null);
      }
      if (subRes.data) {
        setUsage(subRes.data);
      }
    } catch (e: any) {
      setError(e.message ?? "予期しないエラーが発生しました");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchMinutes();
    }
  }, [authLoading, fetchMinutes]);

  useFocusEffect(
    useCallback(() => {
      if (!authLoading && user) {
        fetchMinutes();
      }
    }, [authLoading, user, fetchMinutes]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMinutes();
  }, [fetchMinutes]);

  const recentMinutes = minutes.slice(0, 5);

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

  // -------- Main screen ----------
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={["top", "left", "right"]}>
      <FlatList
        data={recentMinutes}
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
            {/* Header */}
            <FadeInView delay={0} style={styles.header} />

            {/* Usage bar */}
            {usage && (
              <FadeInView delay={100}>
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
                  {usage.limitSeconds !== Infinity && (
                    <View style={[styles.usageTrack, { backgroundColor: c.border }]}>
                      <View
                        style={[
                          styles.usageFill,
                          {
                            backgroundColor: c.primary,
                            width: `${Math.min(
                              100,
                              (usage.usageSeconds / usage.limitSeconds) * 100
                            )}%`,
                          },
                        ]}
                      />
                    </View>
                  )}
                </GlassCard>
              </FadeInView>
            )}

            {/* Quick Record button */}
            <BounceInView delay={200} style={styles.recordWrapper}>
              <TouchableOpacity
                style={[styles.recordButton, { backgroundColor: c.primary }]}
                onPress={() => { haptics.heavyTap(); router.push("/record"); }}
                onPressIn={recordBtn.onPressIn}
                onPressOut={recordBtn.onPressOut}
                activeOpacity={0.8}
              >
                <View style={styles.recordIconCircle}>
                  <Ionicons name="mic" size={28} color="#fff" />
                </View>
                <View style={styles.recordTextGroup}>
                  <Text style={[styles.recordText, { color: c.textInverse }]}>タップして録音</Text>
                  <Text style={[styles.recordSubtext, { color: c.primaryBg }]}>または音声ファイルをインポート</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={c.primaryBg} />
              </TouchableOpacity>
            </BounceInView>

            {/* Section title */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>最近の議事録</Text>
              {minutes.length > 5 && (
                <TouchableOpacity onPress={() => router.push("/(tabs)/minutes")}>
                  <Text style={[styles.seeAll, { color: c.primary }]}>すべて見る</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        }
        ListEmptyComponent={
          loading ? null : (
            <FadeInView delay={300} style={styles.emptyContainer}>
              <Text style={[styles.emptyTitle, { color: c.textPrimary }]}>まだ議事録がありません</Text>
              <Text style={[styles.emptySubtext, { color: c.textSecondary }]}>
                上の録音ボタンをタップして最初の議事録を作成しましょう。
              </Text>
            </FadeInView>
          )
        }
        renderItem={({ item, index }) => (
          <FadeInView delay={300 + index * 80} style={styles.minuteItemWrapper}>
            <TouchableOpacity
              onPress={() => { haptics.lightTap(); router.push(`/minute/${item.id}`); }}
              activeOpacity={0.7}
            >
              <GlassCard intensity={30} style={styles.minuteItem}>
                <View style={styles.minuteLeft}>
                  <Text style={[styles.minuteTitle, { color: c.textPrimary }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={[styles.minuteDate, { color: c.textMuted }]}>{formatDate(item.created_at)}</Text>
                </View>
                <View style={styles.minuteRight}>
                  {item.tags && item.tags.length > 0 && (
                    <View style={[styles.tagBadge, { backgroundColor: c.primaryBg }]}>
                      <Text style={[styles.tagBadgeText, { color: c.primary }]}>
                        {item.tags.length} タグ
                      </Text>
                    </View>
                  )}
                  <Text style={[styles.chevron, { color: c.textMuted }]}>›</Text>
                </View>
              </GlassCard>
            </TouchableOpacity>
          </FadeInView>
        )}
      />

      {error && (
        <View style={[styles.errorBanner, { backgroundColor: c.errorBg, borderTopColor: c.error }]}>
          <Text style={[styles.errorText, { color: c.error }]}>{error}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { paddingBottom: 32 },

  /* Header */
  header: { paddingHorizontal: Spacing.xxl, paddingTop: Spacing.lg, paddingBottom: Spacing.sm },
  title: { fontSize: 32, fontWeight: "700", color: Colors.textPrimary },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: Spacing.xs },

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
  usageText: { fontSize: 13, color: Colors.textSecondary, fontWeight: "500" },
  usageTrack: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: "hidden",
  },
  usageFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },

  /* Record button wrapper */
  recordWrapper: {
    marginHorizontal: Spacing.xxl,
    marginTop: Spacing.xl,
  },

  /* Record button */
  recordButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
    ...Shadows.lg,
  },
  recordIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  recordTextGroup: {
    flex: 1,
  },
  recordText: { fontSize: 16, fontWeight: "700", color: Colors.textInverse },
  recordSubtext: { fontSize: 12, color: Colors.primaryBg, marginTop: 2 },

  /* Section header */
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.xxl,
    marginTop: 28,
    marginBottom: Spacing.md,
  },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: Colors.textPrimary },
  seeAll: { fontSize: 14, color: Colors.primary, fontWeight: "600" },

  /* Empty state */
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 48,
    paddingHorizontal: Spacing.xxxl,
  },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: Colors.textPrimary },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: Spacing.sm,
    lineHeight: 20,
  },

  /* Minute item */
  minuteItemWrapper: {
    marginHorizontal: Spacing.xxl,
    marginBottom: Spacing.sm,
  },
  minuteItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  minuteLeft: { flex: 1, marginRight: Spacing.md },
  minuteTitle: { fontSize: 15, fontWeight: "600", color: Colors.textPrimary },
  minuteDate: { fontSize: 12, color: Colors.textMuted, marginTop: Spacing.xs },
  minuteRight: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  tagBadge: {
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  tagBadgeText: { fontSize: 11, color: Colors.primary, fontWeight: "500" },
  chevron: { fontSize: 20, color: Colors.textMuted },

  /* Sign in */
  signInPrompt: { fontSize: 16, color: Colors.textSecondary, marginBottom: Spacing.lg },
  signInButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xxxl,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    ...Shadows.sm,
  },
  signInButtonText: { fontSize: 16, fontWeight: "700", color: Colors.textInverse },

  /* Error banner */
  errorBanner: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fef2f2",
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "#fecaca",
  },
  errorText: { color: "#b91c1c", fontSize: 13, textAlign: "center" },
});
