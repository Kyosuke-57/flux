import React, { useMemo, useState } from "react";
import { FlatList, RefreshControl, TouchableOpacity, StyleSheet, View, TextInput, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../../src/contexts/AuthContext";
import { useSettings } from "../../../src/contexts/SettingsContext";
import { theme } from "../../../src/theme";
import { useAuthData } from "./hooks/use-auth-data";
import { AuthCard } from "./components/auth-card";
import { EmptyState } from "./components/empty-state";
import { LoadingSkeleton, UnauthenticatedView } from "./components/skeleton-state";
import { FormModal } from "./components/form-modal";
import { SortControl } from "./components/sort-control";
import { filterAuthData, sortAuthData } from "./hooks/utils";
import type { SortField, SortDirection } from "./hooks/utils";

export default function AuthScreen() {
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

  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const filteredItems = useMemo(
    () => filterAuthData(items, searchQuery),
    [items, searchQuery],
  );

  const sortedItems = useMemo(
    () => sortAuthData(filteredItems, sortField, sortDirection),
    [filteredItems, sortField, sortDirection],
  );

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
      {/* 検索バー */}
      {items.length > 0 && (
        <View style={[styles.searchContainer, { backgroundColor: c.background }]}>
          <View style={[styles.searchBar, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Ionicons name="search" size={18} color={c.textMuted} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: c.textPrimary }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="名前またはプロバイダで検索..."
              placeholderTextColor={c.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.searchClear}>
                <Ionicons name="close-circle" size={18} color={c.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* ソートコントロール */}
      {items.length > 0 && (
        <SortControl
          sortField={sortField}
          sortDirection={sortDirection}
          onChange={(field, dir) => {
            setSortField(field);
            setSortDirection(dir);
          }}
          color={c}
        />
      )}

      {/* 空状態 */}
      {items.length === 0 ? (
        <EmptyState onAdd={openCreateForm} color={c} />
      ) : filteredItems.length === 0 ? (
        <View style={styles.emptySearch}>
          <Ionicons name="search-outline" size={40} color={c.textMuted} />
          <Text style={[styles.emptySearchText, { color: c.textSecondary }]}>
            「{searchQuery}」に一致するデータがありません
          </Text>
        </View>
      ) : (
        <FlatList
          data={sortedItems}
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
          ListHeaderComponent={<View style={styles.headerRow} />}
          renderItem={({ item }) => (
            <AuthCard
              item={item}
              onEdit={openEditForm}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
              color={c}
            />
          )}
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
  headerRow: {
    paddingTop: 16,
  },
  searchContainer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 4,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  searchClear: {
    marginLeft: 4,
    padding: 2,
  },
  emptySearch: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptySearchText: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 20,
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
