import React from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../../src/contexts/AuthContext";
import { useSettings } from "../../../src/contexts/SettingsContext";
import { theme } from "../../../src/theme";
import { useStorageData } from "./hooks/use-storage-data";
import { SearchBar } from "../minutes/components/search-bar";
import { StorageCard } from "./components/storage-card";
import { StorageFormModal } from "./components/storage-form-modal";
import { EmptyState } from "./components/empty-state";
import { LoadingSkeleton, UnauthenticatedView } from "./components/skeleton-state";

export default function StorageScreen() {
  const { settings } = useSettings();
  const c = theme(settings.isDarkMode);
  const { user } = useAuth();

  const {
    items,
    loading,
    refreshing,
    search,
    formModalVisible,
    editingItem,
    formData,
    onRefresh,
    handleSearch,
    openCreateForm,
    openEditForm,
    handleDelete,
    closeForm,
    updateFormField,
    handleCreate,
    handleUpdate,
  } = useStorageData();

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
      <SearchBar search={search} onSearchChange={handleSearch} color={c} />

      {items.length === 0 && !search ? (
        <EmptyState color={c} onCreate={openCreateForm} />
      ) : (
        <FlatList
          data={items}
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
            <View style={styles.headerRow}>
              <StorageHeader
                count={items.length}
                onCreate={openCreateForm}
                color={c}
              />
            </View>
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={[styles.emptyText, { color: c.textSecondary }]}>
                該当する録音データがありません
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <StorageCard
              item={item}
              onEdit={openEditForm}
              onDelete={handleDelete}
              color={c}
            />
          )}
        />
      )}

      {/* 作成・編集モーダル */}
      <StorageFormModal
        visible={formModalVisible}
        editingItem={editingItem}
        formData={formData}
        onClose={closeForm}
        onUpdateField={updateFormField}
        onSubmit={editingItem ? handleUpdate : handleCreate}
        color={c}
      />
    </SafeAreaView>
  );
}

/** ヘッダー行: 件数表示 + 新規作成ボタン */
function StorageHeader({
  count,
  onCreate,
  color,
}: {
  count: number;
  onCreate: () => void;
  color: ReturnType<typeof theme>;
}) {
  return (
    <View style={headerStyles.row}>
      <Text style={[headerStyles.count, { color: color.textSecondary }]}>
        全 {count} 件
      </Text>
      <TouchableOpacity
        style={[headerStyles.addBtn, { backgroundColor: color.primary }]}
        onPress={onCreate}
      >
        <Ionicons name="add" size={18} color={color.textInverse} />
        <Text style={[headerStyles.addText, { color: color.textInverse }]}>
          新規作成
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const headerStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  count: {
    fontSize: 13,
    fontWeight: "500",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addText: {
    fontSize: 13,
    fontWeight: "600",
  },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingBottom: 24 },
  headerRow: {},
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 40,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
  },
});
