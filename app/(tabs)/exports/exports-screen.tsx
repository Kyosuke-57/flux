import React, { useCallback, useState } from "react";
import {
  FlatList,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  View,
  Text,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../../src/contexts/AuthContext";
import { useSettings } from "../../../src/contexts/SettingsContext";
import { theme } from "../../../src/theme";
import { useExportsData } from "./hooks/use-exports-data";
import { ExportCard } from "./components/export-card";
import { ExportFormModal } from "./components/export-form-modal";
import { SortControls } from "./components/sort-controls";
import { EmptyState } from "./components/empty-state";
import { LoadingSkeleton } from "./components/skeleton-state";

export default function ExportsScreen() {
  const { settings } = useSettings();
  const c = theme(settings.isDarkMode);
  const { user } = useAuth();

  const {
    filteredExports,
    search,
    sortField,
    sortDirection,
    loading,
    refreshing,
    formModalVisible,
    editingExport,
    setSearch,
    onRefresh,
    handleSort,
    handleOpenCreate,
    handleOpenEdit,
    handleCloseForm,
    handleSave,
    handleDelete,
  } = useExportsData();

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
        <View style={styles.centered}>
          <Text style={[styles.emptyTitle, { color: c.textPrimary }]}>
            サインインしてください
          </Text>
          <Text style={[styles.emptySubtext, { color: c.textSecondary }]}>
            エクスポート履歴の表示・管理にはログインが必要です。
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: c.background }]}
      edges={["top", "left", "right"]}
    >
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: c.textPrimary }]}>エクスポート履歴</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: c.primary }]}
          onPress={handleOpenCreate}
          accessibilityLabel="エクスポートを作成"
        >
          <Ionicons name="add" size={22} color={c.textInverse} />
        </TouchableOpacity>
      </View>

      {/* 検索バー */}
      <View style={[styles.searchContainer, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Ionicons name="search" size={18} color={c.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: c.textPrimary }]}
          value={search}
          onChangeText={setSearch}
          placeholder="エクスポートを検索..."
          placeholderTextColor={c.textMuted}
          clearButtonMode="while-editing"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color={c.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* ソート */}
      <SortControls
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
        color={c}
      />

      {/* 一覧 */}
      {filteredExports.length === 0 && !search ? (
        <EmptyState type="no-exports" onCreate={handleOpenCreate} color={c} />
      ) : filteredExports.length === 0 ? (
        <EmptyState type="no-results" color={c} />
      ) : (
        <FlatList
          data={filteredExports}
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
          renderItem={({ item }) => (
            <ExportCard
              exportItem={item}
              onPress={() => handleOpenEdit(item)}
              onDelete={() => handleDelete(item.id)}
              color={c}
            />
          )}
        />
      )}

      {/* 作成・編集モーダル */}
      <ExportFormModal
        visible={formModalVisible}
        editingExport={editingExport}
        onClose={handleCloseForm}
        onSave={handleSave}
        color={c}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 18, fontWeight: "600", textAlign: "center" },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 24,
    marginVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: "100%",
  },
  list: { paddingBottom: 24 },
});
