import React from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../../src/contexts/AuthContext";
import { useSettings } from "../../../src/contexts/SettingsContext";
import { theme } from "../../../src/theme";
import { useSubscriptionData } from "./hooks/use-subscription-data";
import { PLANS } from "../../../src/services/subscription";
import { secondsToHms } from "./hooks/utils";
import { SubscriptionPlanCard } from "./components/subscription-plan-card";
import { EmptyState } from "./components/empty-state";
import { LoadingSkeleton } from "./components/skeleton-state";

export default function SubscriptionScreen() {
  const { settings } = useSettings();
  const c = theme(settings.isDarkMode);
  const { user } = useAuth();

  const {
    currentPlan,
    loading,
    refreshing,
    upgrading,
    onRefresh,
    handlePurchase,
  } = useSubscriptionData();

  // ── Loading ──
  if (loading) {
    return <LoadingSkeleton color={c} />;
  }

  // ── Not signed in ──
  if (!user) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: c.background }]}
        edges={["top", "left", "right"]}
      >
        <EmptyState type="no-auth" color={c} />
      </SafeAreaView>
    );
  }

  const currentPlanId = currentPlan?.plan ?? null;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: c.background }]}
      edges={["top", "left", "right"]}
    >
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: c.textPrimary }]}>
          サブスクリプション
        </Text>
      </View>

      {/* コンテンツ */}
      {!currentPlan ? (
        <EmptyState type="no-subscription" color={c} />
      ) : (
        <FlatList
          data={PLANS}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={c.primary}
              colors={[c.primary]}
            />
          }
          ListHeaderComponent={
            <View style={styles.currentPlanSection}>
              <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>
                現在のプラン
              </Text>
              <View
                style={[
                  styles.usageCard,
                  { backgroundColor: c.surface, borderColor: c.border },
                ]}
              >
                <Text style={[styles.planName, { color: c.textPrimary }]}>
                  {PLANS.find((p) => p.id === currentPlan.plan)?.name ??
                    currentPlan.plan}
                </Text>
                <View style={styles.usageRow}>
                  <Text
                    style={[styles.usageText, { color: c.textSecondary }]}
                  >
                    今月の使用時間
                  </Text>
                  <Text style={[styles.usageValue, { color: c.textPrimary }]}>
                    {secondsToHms(currentPlan.usageSeconds)} /{" "}
                    {Number.isFinite(currentPlan.limitSeconds)
                      ? secondsToHms(currentPlan.limitSeconds)
                      : "無制限"}
                  </Text>
                </View>
                <View
                  style={[
                    styles.progressBarBg,
                    { backgroundColor: c.border },
                  ]}
                >
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        backgroundColor: c.primary,
                        width: Number.isFinite(currentPlan.limitSeconds)
                          ? `${Math.min(
                              (currentPlan.usageSeconds /
                                (currentPlan.limitSeconds || 1)) *
                                100,
                              100,
                            )}%`
                          : "0%",
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <SubscriptionPlanCard
              plan={item}
              currentPlan={currentPlanId}
              upgrading={upgrading}
              onPurchase={handlePurchase}
              color={c}
              isDark={settings.isDarkMode}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
  },
  list: { paddingBottom: 24 },
  currentPlanSection: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  usageCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  planName: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
  },
  usageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  usageText: {
    fontSize: 13,
    fontWeight: "500",
  },
  usageValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
});
