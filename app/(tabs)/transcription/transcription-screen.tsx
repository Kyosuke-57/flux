import React, { useCallback } from "react";
import { FlatList, RefreshControl, StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../../src/contexts/AuthContext";
import { useThemeColors } from "../../../src/hooks/useThemeColors";
import { useTranscriptionData, type StatusFilter, type SortField, type SortDirection } from "./hooks/use-transcription-data";
import { TranscriptionCard } from "./components/transcription-card";
import { EmptyState } from "./components/empty-state";
import { LoadingSkeleton, UnauthenticatedView } from "./components/skeleton-state";
import { CreateTranscriptionModal } from "./components/create-transcription-modal";
import { EditTranscriptionModal } from "./components/edit-transcription-modal";

const FILTER_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "すべて" },
  { key: "queued", label: "待機中" },
  { key: "processing", label: "処理中" },
  { key: "completed", label: "完了" },
  { key: "failed", label: "失敗" },
];

const SORT_OPTIONS: { key: SortField; label: string }[] = [
  { key: "date", label: "日付" },
  { key: "name", label: "名前" },
  { key: "status", label: "ステータス" },
];

export default function TranscriptionScreen() {
  const c = useThemeColors();
  const { user } = useAuth();

  const {
    jobs,
    recordings,
    statusFilter,
    sortField,
    sortDirection,
    loading,
    refreshing,
    createModalVisible,
    editModalVisible,
    editingJob,
    setStatusFilter,
    setSortField,
    setSortDirection,
    setCreateModalVisible,
    setEditModalVisible,
    handleCreate,
    handleEdit,
    handleDelete,
    handleRetry,
    openEditModal,
    onRefresh,
  } = useTranscriptionData();

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
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: c.textPrimary }]}>文字起こし管理</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: c.primary }]}
          onPress={() => setCreateModalVisible(true)}
        >
          <Ionicons name="add" size={18} color={c.textInverse} />
          <Text style={[styles.addBtnText, { color: c.textInverse }]}>新規</Text>
        </TouchableOpacity>
      </View>

      {/* フィルターバー */}
      <View style={[styles.filterRow, { borderBottomColor: c.divider }]}>
        {FILTER_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[
              styles.filterChip,
              { backgroundColor: c.surfaceSecondary },
              statusFilter === opt.key && { backgroundColor: c.primary },
            ]}
            onPress={() => setStatusFilter(opt.key)}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: c.textSecondary },
                statusFilter === opt.key && { color: c.textInverse, fontWeight: "600" },
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ソートバー */}
      <View style={[styles.sortRow, { borderBottomColor: c.divider }]}>
        <View style={styles.sortChips}>
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.sortChip,
                { backgroundColor: c.surfaceSecondary },
                sortField === opt.key && { backgroundColor: c.primary + "20" },
              ]}
              onPress={() => {
                if (sortField === opt.key) {
                  setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                } else {
                  setSortField(opt.key);
                }
              }}
            >
              <Text
                style={[
                  styles.sortChipText,
                  { color: c.textSecondary },
                  sortField === opt.key && { color: c.primary, fontWeight: "600" },
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={[styles.sortDirBtn, { backgroundColor: c.surfaceSecondary }]}
          onPress={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
        >
          <Ionicons
            name={sortDirection === "asc" ? "arrow-up" : "arrow-down"}
            size={14}
            color={c.textSecondary}
          />
          <Text style={[styles.sortDirText, { color: c.textSecondary }]}>
            {sortDirection === "asc" ? "昇順" : "降順"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 一覧 / 空状態 */}
      {jobs.length === 0 && statusFilter === "all" ? (
        <EmptyState
          type="no-jobs"
          onCreate={() => setCreateModalVisible(true)}
          color={c}
        />
      ) : jobs.length === 0 ? (
        <EmptyState type="no-results" color={c} />
      ) : (
        <FlatList
          data={jobs}
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
            <TranscriptionCard
              item={item}
              onPress={() => openEditModal(item)}
              onDelete={() => handleDelete(item.id)}
              onRetry={() => handleRetry(item.id)}
              color={c}
            />
          )}
        />
      )}

      {/* 作成モーダル */}
      <CreateTranscriptionModal
        visible={createModalVisible}
        recordings={recordings}
        onClose={() => setCreateModalVisible(false)}
        onCreate={handleCreate}
        color={c}
      />

      {/* 編集モーダル */}
      <EditTranscriptionModal
        visible={editModalVisible}
        job={editingJob}
        onClose={() => setEditModalVisible(false)}
        onSave={handleEdit}
        color={c}
      />
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
  headerTitle: { fontSize: 28, fontWeight: "700" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  addBtnText: { fontSize: 14, fontWeight: "600" },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  filterChipText: { fontSize: 12, fontWeight: "500" },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  sortChips: {
    flexDirection: "row",
    gap: 6,
  },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  sortChipText: { fontSize: 12, fontWeight: "500" },
  sortDirBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sortDirText: { fontSize: 11, fontWeight: "500" },
  list: { paddingBottom: 24 },
});
