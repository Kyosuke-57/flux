import { useEffect, useState, useCallback } from "react";
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  RefreshControl, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../src/contexts/AuthContext";
import { getAllMinutes } from "../../src/services/minutes";
import { getSubscriptionStatus } from "../../src/services/subscription";
import type { Minute } from "../../src/types";
import { Colors, Typography, Spacing, BorderRadius, Shadows } from "../../src/theme";

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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMinutes();
  }, [fetchMinutes]);

  const recentMinutes = minutes.slice(0, 5);

  // -------- Auth loading ----------
  if (authLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      </SafeAreaView>
    );
  }

  // -------- Not logged in ----------
  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <Text style={styles.title}>OTOROKU</Text>
          <Text style={styles.subtitle}>録音、文字起こし、整理</Text>
        </View>
        <View style={styles.center}>
          <Text style={styles.signInPrompt}>サインインして始めよう</Text>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => router.push("/(auth)/login")}
            activeOpacity={0.8}
          >
            <Text style={styles.signInButtonText}>サインイン</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // -------- Main screen ----------
  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <FlatList
        data={recentMinutes}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6366f1"
            colors={["#6366f1"]}
          />
        }
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>OTOROKU</Text>
              <Text style={styles.subtitle}>録音、文字起こし、整理</Text>
            </View>

            {/* Usage bar */}
            {usage && (
              <View style={styles.usageBar}>
                <View style={styles.usageRow}>
                  <Text style={styles.usageText}>
                    {usage.plan.charAt(0).toUpperCase() + usage.plan.slice(1)} プラン
                  </Text>
                  <Text style={styles.usageText}>
                    {secondsToHms(usage.usageSeconds)} /{" "}
                    {usage.limitSeconds === Infinity
                      ? "∞"
                      : secondsToHms(usage.limitSeconds)}
                  </Text>
                </View>
                {usage.limitSeconds !== Infinity && (
                  <View style={styles.usageTrack}>
                    <View
                      style={[
                        styles.usageFill,
                        {
                          width: `${Math.min(
                            100,
                            (usage.usageSeconds / usage.limitSeconds) * 100
                          )}%`,
                        },
                      ]}
                    />
                  </View>
                )}
              </View>
            )}

            {/* Quick Record button */}
            <TouchableOpacity
              style={styles.recordButton}
              onPress={() => router.push("/record")}
              activeOpacity={0.8}
            >
              <Text style={styles.recordIcon}>🎤</Text>
              <Text style={styles.recordText}>タップして録音</Text>
              <Text style={styles.recordSubtext}>または音声ファイルをインポート</Text>
            </TouchableOpacity>

            {/* Section title */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>最近の議事録</Text>
              {minutes.length > 5 && (
                <TouchableOpacity onPress={() => router.push("/(tabs)/minutes")}>
                  <Text style={styles.seeAll}>すべて見る</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#6366f1" />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📝</Text>
              <Text style={styles.emptyTitle}>まだ議事録がありません</Text>
              <Text style={styles.emptySubtext}>
                上の録音ボタンをタップして最初の議事録を作成しましょう。
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.minuteItem}
            onPress={() => router.push(`/minute/${item.id}`)}
            activeOpacity={0.7}
          >
            <View style={styles.minuteLeft}>
              <Text style={styles.minuteTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.minuteDate}>{formatDate(item.created_at)}</Text>
            </View>
            <View style={styles.minuteRight}>
              {item.tags && item.tags.length > 0 && (
                <View style={styles.tagBadge}>
                  <Text style={styles.tagBadgeText}>
                    {item.tags.length} タグ
                  </Text>
                </View>
              )}
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
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
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
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

  /* Record button */
  recordButton: {
    backgroundColor: Colors.primary,
    marginHorizontal: Spacing.xxl,
    marginTop: Spacing.xl,
    paddingVertical: Spacing.xxl,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    ...Shadows.lg,
  },
  recordIcon: { fontSize: 32 },
  recordText: { fontSize: 18, fontWeight: "700", color: Colors.textInverse, marginTop: Spacing.sm },
  recordSubtext: { fontSize: 13, color: Colors.primaryBg, marginTop: Spacing.xs },

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
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: Colors.textPrimary },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: Spacing.sm,
    lineHeight: 20,
  },

  /* Minute item */
  minuteItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.xxl,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
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
