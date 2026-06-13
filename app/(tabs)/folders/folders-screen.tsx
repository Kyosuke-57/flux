import React from "react";
import { FlatList, RefreshControl, TouchableOpacity, StyleSheet, View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../../src/contexts/AuthContext";
import { useSettings } from "../../../src/contexts/SettingsContext";
import { theme } from "../../../src/theme";
import { useFoldersData } from "./hooks/use-folders-data";
import { FolderCard } from "./components/folder-card";
import { FolderFormModal } from "./components/form-modal";
import { EmptyState } from "./components/empty-state";
import { LoadingSkeleton } from "./components/skeleton-state";
import { SortControls } from "./components/sort-controls";

export default function FoldersScreen() {
  const { settings } = useSettings();
  const c = theme(settings.isDarkMode);
  const { user } = useAuth();

  const {
    filteredFolders,
    search,
    loading,
    refreshing,
    formModalVisible,
    editingFolder,
    sortBy,
    sortOrder,
    setSearch,
    setSortBy,
    setSortOrder,
    onRefresh,
    handleOpenCreate,
    handleOpenEdit,
    handleCloseForm,
    handleSave,
    handleDelete,
  } = useFoldersData();

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
            フォルダの表示・管理にはログインが必要です。
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
        <Text style={[styles.headerTitle, { color: c.textPrimary }]}>フォルダ</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: c.primary }]}
          onPress={handleOpenCreate}
          accessibilityLabel="フォルダを作成"
        >
          <Ionicons name="add" size={22} color={c.textInverse} />
        </TouchableOpacity>
      </View>

      {/* ソートコントロール */}
      <SortControls
        sortBy={sortBy}
        sortOrder={sortOrder}
        onChangeSortBy={setSortBy}
        onToggleOrder={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
        color={c}
      />

      {/* 一覧 */}
      {filteredFolders.length === 0 && !search ? (
        <EmptyState type="no-folders" onCreate={handleOpenCreate} color={c} />
      ) : filteredFolders.length === 0 ? (
        <EmptyState type="no-results" color={c} />
      ) : (
        <FlatList
          data={filteredFolders}
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
            <FolderCard
              folder={item}
              onPress={() => handleOpenEdit(item)}
              onDelete={() => handleDelete(item.id)}
              color={c}
            />
          )}
        />
      )}

      {/* 作成・編集モーダル */}
      <FolderFormModal
        visible={formModalVisible}
        editingFolder={editingFolder}
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
  list: { paddingBottom: 24 },
});
