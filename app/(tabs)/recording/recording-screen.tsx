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
import { useThemeColors } from "../../../src/hooks/useThemeColors";
import { useRecordingData } from "./hooks/use-recording-data";
import { RecordingCard } from "./components/recording-card";
import { RecordingFormModal } from "./components/recording-form-modal";
import { EmptyState } from "./components/empty-state";
import { SearchBar } from "./components/search-bar";
import { SortControls } from "./components/sort-controls";
import { LoadingSkeleton, UnauthenticatedView } from "./components/skeleton-state";

export default function RecordingScreen() {
  const c = useThemeColors();
  const { user } = useAuth();

  const {
    items,
    filteredItems,
    loading,
    refreshing,
    searchQuery,
    setSearchQuery,
    sortField,
    sortDirection,
    toggleSort,
    formModalVisible,
    editingItem,
    formData,
    onRefresh,
    openCreateForm,
    openEditForm,
    handleDelete,
    closeForm,
    updateFormField,
    handleCreate,
    handleUpdate,
  } = useRecordingData();

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
      {items.length === 0 ? (
        <EmptyState color={c} onCreate={openCreateForm} />
      ) : (
        <FlatList
          data={filteredItems}
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
            <View>
              <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                color={c}
              />
              <SortControls
                sortField={sortField}
                sortDirection={sortDirection}
                onToggle={toggleSort}
                color={c}
              />
              <View style={styles.headerRow}>
                <RecordingHeader
                  count={filteredItems.length}
                  total={items.length}
                  onCreate={openCreateForm}
                  color={c}
                />
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <RecordingCard
              item={item}
              onEdit={openEditForm}
              onDelete={handleDelete}
              color={c}
            />
          )}
        />
      )}

      {/* 作成・編集モーダル */}
      <RecordingFormModal
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
function RecordingHeader({
  count,
  total,
  onCreate,
  color,
}: {
  count: number;
  total?: number;
  onCreate: () => void;
  color: ReturnType<typeof useThemeColors>;
}) {
  const label =
    total !== undefined && count !== total
      ? `${count} 件（全 ${total} 件中）`
      : `全 ${count} 件`;
  return (
    <View style={headerStyles.row}>
      <Text style={[headerStyles.count, { color: color.textSecondary }]}>
        {label}
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
});
