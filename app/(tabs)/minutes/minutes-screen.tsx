import React, { useCallback, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "../../../src/contexts/AuthContext";
import { useThemeColors } from "../../../src/hooks/useThemeColors";
import { useMinutesData } from "./hooks/use-minutes-data";
import { SearchBar } from "./components/search-bar";
import { FilterBar } from "./components/filter-bar";
import { SortBar } from "./components/sort-bar";
import { SelectModeHeader } from "./components/select-mode-header";
import { SectionHeader } from "./components/section-header";
import { MinuteCard } from "./components/minute-card";
import { EmptyState } from "./components/empty-state";
import { LoadingSkeleton, UnauthenticatedView } from "./components/skeleton-state";
import { CreateFolderModal } from "./components/create-folder-modal";
import { ActionSheet } from "../../../src/components/ActionSheet";
import { exportAndShareMinute, type ExportFormat } from "../../../src/services/export";
import type { Minute } from "../../../src/types";

export default function MinutesScreen() {
  const c = useThemeColors();
  const { user } = useAuth();

  const {
    // Data
    search,
    selectedTag,
    selectedFolderId,
    loading,
    refreshing,
    sortBy,
    selectMode,
    selectedIds,
    folderModalVisible,
    newFolderName,
    tags,
    folders,

    // Setters
    setSelectedTag,
    setSelectedFolderId,
    setSortBy,
    setSelectMode,
    setSelectedIds,
    setFolderModalVisible,
    setNewFolderName,

    // Actions
    handleSearch,
    handleDelete,
    handleLongPress,
    toggleSelect,
    handleBulkDelete,
    handleCreateFolder,
    onRefresh,

    // Derived
    sections,
    isShowingAll,
  } = useMinutesData();

  const totalCount = sections.reduce((sum, s) => sum + s.data.length, 0);

  const handleToggleSelectAll = useCallback(() => {
    const allIds = sections.flatMap((s) => s.data).map((m) => m.id);
    if (selectedIds.size === allIds.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  }, [sections, selectedIds, setSelectedIds]);

  const handleCancelSelect = useCallback(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
  }, [setSelectMode, setSelectedIds]);

  const handleShowAll = useCallback(() => {
    setSelectedFolderId(null);
    setSelectedTag(null);
  }, [setSelectedFolderId, setSelectedTag]);

  const handleAddFolder = useCallback(() => {
    setNewFolderName("");
    setFolderModalVisible(true);
  }, [setNewFolderName, setFolderModalVisible]);

  // ── Export ──
  const [exportMinute, setExportMinute] = useState<Minute | null>(null);

  const handleExport = useCallback((minute: Minute) => {
    setExportMinute(minute);
  }, []);

  const handleExportFormat = useCallback(
    async (format: ExportFormat) => {
      const minute = exportMinute;
      setExportMinute(null);
      if (!minute) return;
      try {
        await exportAndShareMinute(minute, format);
      } catch (e: unknown) {
        Alert.alert("エクスポートエラー", e instanceof Error ? e.message : "エクスポートに失敗しました。");
      }
    },
    [exportMinute],
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
      {/* 選択モードヘッダー */}
      {selectMode && (
        <SelectModeHeader
          selectedCount={selectedIds.size}
          totalCount={totalCount}
          onCancel={handleCancelSelect}
          onToggleSelectAll={handleToggleSelectAll}
          onBulkDelete={handleBulkDelete}
          color={c}
        />
      )}

      {/* 検索バー */}
      <SearchBar search={search} onSearchChange={handleSearch} color={c} />

      {/* フィルター行 */}
      <FilterBar
        folders={folders}
        tags={tags}
        selectedFolderId={selectedFolderId}
        selectedTag={selectedTag}
        isShowingAll={isShowingAll}
        onSelectFolder={setSelectedFolderId}
        onSelectTag={setSelectedTag}
        onShowAll={handleShowAll}
        onAddFolder={handleAddFolder}
        color={c}
      />

      {/* ソートバー */}
      <SortBar sortBy={sortBy} onSortChange={setSortBy} color={c} />

      {/* 一覧 / 空状態 */}
      {sections.length === 0 && !search ? (
        <EmptyState
          type="no-minutes"
          onRecord={() => router.push("/record")}
          color={c}
        />
      ) : sections.length === 0 ? (
        <EmptyState type="no-results" color={c} />
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(item) => item.folderId ?? "__none__"}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={c.primary}
              colors={[c.primary]}
            />
          }
          renderItem={({ item: section }) => (
            <View style={styles.section}>
              <SectionHeader
                title={section.title}
                folderId={section.folderId}
                count={section.data.length}
                color={c}
              />
              {section.data.map((item) => {
                const isSelected = selectedIds.has(item.id);
                return (
                  <MinuteCard
                    key={item.id}
                    item={item}
                    search={search}
                    selectMode={selectMode}
                    isSelected={isSelected}
                    onPress={() => {
                      if (selectMode) {
                        toggleSelect(item.id);
                      } else {
                        router.push(`/minute/${item.id}`);
                      }
                    }}
                    onLongPress={() => handleLongPress(item)}
                    onDelete={() => handleDelete(item.id)}
                    onExport={() => handleExport(item)}
                    formatDate={(iso) => {
                      const d = new Date(iso);
                      return d.toLocaleDateString("ja-JP", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                    }}
                    getTagName={(tagId) => {
                      const found = tags.find((t) => t.id === tagId);
                      return found ? found.name : tagId;
                    }}
                    getPreview={(content) => {
                      const stripped = content.replace(/[#*`\[\]]/g, "").trim();
                      return stripped.length > 100
                        ? stripped.slice(0, 100) + "…"
                        : stripped;
                    }}
                    color={c}
                  />
                );
              })}
            </View>
          )}
        />
      )}

      {/* フォルダ作成モーダル */}
      <CreateFolderModal
        visible={folderModalVisible}
        newFolderName={newFolderName}
        onNewFolderNameChange={setNewFolderName}
        onClose={() => setFolderModalVisible(false)}
        onCreate={handleCreateFolder}
        color={c}
      />

      {/* エクスポート形式選択 */}
      <ActionSheet
        visible={!!exportMinute}
        title="エクスポート形式を選択"
        options={[
          { label: "テキスト (.txt)", onPress: () => handleExportFormat("txt") },
          { label: "Markdown (.md)", onPress: () => handleExportFormat("md") },
          { label: "PDF (.pdf)", onPress: () => handleExportFormat("pdf") },
        ]}
        onClose={() => setExportMinute(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingBottom: 24 },
  section: { marginTop: 2 },
});
