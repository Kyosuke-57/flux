import React, { useMemo, useState } from "react";
import { FlatList, RefreshControl, TouchableOpacity, StyleSheet, View, TextInput, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../../src/contexts/AuthContext";
import { useSettings } from "../../../src/contexts/SettingsContext";
import { theme } from "../../../src/theme";
import { useAuthData } from "./hooks/use-auth-data";
import { AuthDataCard } from "./components/auth-data-card";
import { EmptyState } from "./components/empty-state";
import { LoadingSkeleton, UnauthenticatedView } from "./components/skeleton-state";
import { FormModal } from "./components/form-modal";
import { sortItems } from "./hooks/utils";
import type { SortField, SortDirection } from "./hooks/utils";

const SORT_OPTIONS: { field: SortField; label: string }[] = [
  { field: "date", label: "日付" },
  { field: "name", label: "名前" },
  { field: "status", label: "ステータス" },
];

export default function AuthDataScreen() {
  const { settings } = useSettings();
  const c = theme(settings.isDarkMode);
  const { user } = useAuth();

  const {
    items,
    loading,
    refreshing,
    formVisible,
    editingItem,
    formProvider,
    formLabel,
    formApiKey,
    formSaving,
    setFormProvider,
    setFormLabel,
    setFormApiKey,
    setFormVisible,
    openCreateForm,
    openEditForm,
    handleSave,
    handleDelete,
    handleToggleActive,
    onRefresh,
  } = useAuthData();

  // ── 検索 ──
  const [searchQuery, setSearchQuery] = useState("");

  // ── ソート ──
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSortChange = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection(field === "date" ? "desc" : "asc");
    }
  };

  const processedItems = useMemo(() => {
    // 1. フィルタリング
    const filtered = !searchQuery.trim()
      ? items
      : items.filter(
          (item) =>
            item.label.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
            item.provider.toLowerCase().includes(searchQuery.trim().toLowerCase()),
        );
    // 2. ソート
    return sortItems(filtered, sortField, sortDirection);
  }, [items, searchQuery, sortField, sortDirection]);

  // ── Loading ──
  if (loading) {
    return <LoadingSkeleton color={c} />;
  }

  // ── Not signed in ──
  if (!user) {
    return <UnauthenticatedView color={c} />;
  }

  // ── Main screen ──
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: c.background }]}
      edges={["top", "left", "right"]}
    >
      {/* 空状態 */}
      {items.length === 0 ? (
        <EmptyState onAdd={openCreateForm} color={c} />
      ) : (
        <FlatList
          data={processedItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View>
              {/* 検索バー */}
              <View style={[styles.searchWrapper, { backgroundColor: c.background }]}>
                <View style={[styles.searchBar, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]}>
                  <Ionicons name="search" size={16} color={c.textMuted} />
                  <TextInput
                    style={[styles.searchInput, { color: c.textPrimary }]}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="名前またはプロバイダで検索..."
                    placeholderTextColor={c.textMuted}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery("")}>
                      <Ionicons name="close-circle" size={16} color={c.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              {/* ソートコントロール */}
              <View style={[styles.sortRow, { backgroundColor: c.background }]}>
                {SORT_OPTIONS.map((opt) => {
                  const active = sortField === opt.field;
                  const icon = active
                    ? sortDirection === "asc"
                      ? "arrow-up"
                      : "arrow-down"
                    : "arrow-up";
                  return (
                    <TouchableOpacity
                      key={opt.field}
                      style={[
                        styles.sortChip,
                        {
                          backgroundColor: active ? c.primaryBg : "transparent",
                          borderColor: active ? c.primary : c.border,
                        },
                      ]}
                      onPress={() => handleSortChange(opt.field)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.sortChipText,
                          { color: active ? c.primary : c.textMuted },
                        ]}
                      >
                        {opt.label}
                      </Text>
                      <Ionicons
                        name={icon}
                        size={12}
                        color={active ? c.primary : "transparent"}
                        style={styles.sortIcon}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={c.primary}
              colors={[c.primary]}
            />
          }
          renderItem={({ item }) => (
            <AuthDataCard
              item={item}
              onEdit={openEditForm}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
              color={c}
            />
          )}
          ListEmptyComponent={
            searchQuery.trim() ? (
              <View style={styles.noResults}>
                <Ionicons name="search-outline" size={40} color={c.textMuted} />
              </View>
            ) : null
          }
        />
      )}

      {/* 追加FAB */}
      {items.length > 0 && (
        <View style={styles.fabContainer}>
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: c.primary }]}
            onPress={openCreateForm}
            activeOpacity={0.8}
          >
            <View style={styles.fabIcon}>
              <View style={styles.fabPlusH} />
              <View style={[styles.fabPlusV, { backgroundColor: "#fff" }]} />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* フォームモーダル */}
      <FormModal
        visible={formVisible}
        editingItem={editingItem}
        provider={formProvider}
        label={formLabel}
        apiKey={formApiKey}
        saving={formSaving}
        onProviderChange={setFormProvider}
        onLabelChange={setFormLabel}
        onApiKeyChange={setFormApiKey}
        onSave={handleSave}
        onClose={() => setFormVisible(false)}
        color={c}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingBottom: 80 },
  searchWrapper: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 4,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
  },
  sortRow: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 8,
  },
  sortChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  sortChipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  sortIcon: {
    marginLeft: 4,
  },
  noResults: {
    alignItems: "center",
    paddingTop: 60,
  },
  fabContainer: {
    position: "absolute",
    bottom: 24,
    right: 24,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabIcon: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  fabPlusH: {
    position: "absolute",
    width: 20,
    height: 3,
    backgroundColor: "#fff",
    borderRadius: 2,
  },
  fabPlusV: {
    width: 3,
    height: 20,
    borderRadius: 2,
  },
});
