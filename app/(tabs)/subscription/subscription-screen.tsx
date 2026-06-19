import React, { useState, useMemo } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../../src/contexts/AuthContext";
import { useSettings } from "../../../src/contexts/SettingsContext";
import { useThemeColors } from "../../../src/hooks/useThemeColors";
import { useSubscriptionData } from "./hooks/use-subscription-data";
import { PLANS } from "../../../src/services/subscription";
import {
  secondsToHms,
  filterPlans,
  sortPlans,
  SORT_LABELS,
  type SortField,
  type SortOrder,
} from "./hooks/utils";
import { SubscriptionPlanCard } from "./components/subscription-plan-card";
import { EmptyState } from "./components/empty-state";
import { LoadingSkeleton } from "./components/skeleton-state";

export default function SubscriptionScreen() {
  const { settings } = useSettings();
  const c = useThemeColors();
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

  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  const sortedPlans = useMemo(
    () => sortPlans(PLANS, sortField, sortOrder),
    [sortField, sortOrder],
  );
  const filteredPlans = useMemo(
    () => filterPlans(sortedPlans, searchQuery),
    [sortedPlans, searchQuery],
  );

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
          placeholder="プランを検索（名前・機能）"
          placeholderTextColor={c.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <Ionicons
            name="close-circle"
            size={18}
            color={c.textMuted}
            onPress={() => setSearchQuery("")}
          />
        )}
      </View>

      {/* ソートコントロール */}
      <View style={styles.sortContainer}>
        <View style={styles.sortChips}>
          {(Object.keys(SORT_LABELS) as SortField[]).map((field) => (
            <TouchableOpacity
              key={field}
              style={[
                styles.sortChip,
                {
                  backgroundColor:
                    sortField === field ? c.primary : c.surface,
                  borderColor:
                    sortField === field ? c.primary : c.border,
                },
              ]}
              onPress={() => setSortField(field)}
              accessibilityLabel={`${SORT_LABELS[field]}でソート`}
            >
              <Text
                style={[
                  styles.sortChipText,
                  {
                    color:
                      sortField === field ? c.textInverse : c.textSecondary,
                  },
                ]}
              >
                {SORT_LABELS[field]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={[
            styles.orderToggle,
            { backgroundColor: c.surface, borderColor: c.border },
          ]}
          onPress={() =>
            setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
          }
          accessibilityLabel={
            sortOrder === "asc" ? "昇順" : "降順"
          }
        >
          <Ionicons
            name={sortOrder === "asc" ? "arrow-up" : "arrow-down"}
            size={16}
            color={c.textPrimary}
          />
        </TouchableOpacity>
      </View>

      {/* コンテンツ */}
      {!currentPlan ? (
        <EmptyState type="no-subscription" color={c} />
      ) : (
        <FlatList
          data={filteredPlans}
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
          ListEmptyComponent={
            searchQuery.length > 0 ? (
              <View style={styles.noResults}>
                <Text style={[styles.noResultsText, { color: c.textSecondary }]}>
                  该当するプランが見つかりません
                </Text>
              </View>
            ) : null
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
  sortContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 8,
    gap: 8,
  },
  sortChips: {
    flexDirection: "row",
    gap: 6,
    flex: 1,
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  sortChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  orderToggle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 24,
    marginBottom: 8,
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  noResults: {
    paddingVertical: 60,
    alignItems: "center",
  },
  noResultsText: {
    fontSize: 14,
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
