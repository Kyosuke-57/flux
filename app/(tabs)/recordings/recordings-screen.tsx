import React, { useCallback, useState } from "react";
import {
  FlatList,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  View,
  Text,
  TextInput,
  SectionList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../../src/contexts/AuthContext";
import { useThemeColors } from "../../../src/hooks/useThemeColors";
import { useRecordingsData } from "./hooks/use-recordings-data";
import { RecordingCard } from "./components/recording-card";
import { RecordingFormModal } from "./components/recording-form-modal";
import { EmptyState } from "./components/empty-state";
import { LoadingSkeleton, UnauthenticatedView } from "./components/skeleton-state";
import { sortRecordings } from "./hooks/utils";
import type { SortKey, SortOrder } from "./hooks/utils";

export default function RecordingsScreen() {
  const c = useThemeColors();
  const { user } = useAuth();

  const {
    items,
    transcribedItems,
    notTranscribedItems,
    loading,
    refreshing,
    formVisible,
    editingItem,
    formData,
    formSaving,
    updateFormField,
    setFormVisible,
    openCreateForm,
    openEditForm,
    handleSave,
    handleDelete,
    onRefresh,
  } = useRecordingsData();

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("desc");
    }
  };

  const sortedItems = React.useMemo(
    () => sortRecordings(items, sortKey, sortOrder),
    [items, sortKey, sortOrder],
  );

  const filteredItems = React.useMemo(() => {
    if (!search.trim()) return sortedItems;
    const q = search.toLowerCase();
    return sortedItems.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        (i.file_path && i.file_path.toLowerCase().includes(q)),
    );
  }, [items, search]);

  const filteredTranscribed = filteredItems.filter((i) => i.transcribed);
  const filteredNotTranscribed = filteredItems.filter((i) => !i.transcribed);

  const sections = [
    ...(filteredNotTranscribed.length > 0
      ? [{ title: "未完了", data: filteredNotTranscribed }]
      : []),
    ...(filteredTranscribed.length > 0
      ? [{ title: "完了", data: filteredTranscribed }]
      : []),
  ];

  // Loading
  if (loading) {
    return <LoadingSkeleton color={c} />;
  }

  // Not signed in
  if (!user) {
    return <UnauthenticatedView color={c} />;
  }

  const totalCount = items.length;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: c.background }]}
      edges={["top", "left", "right"]}
    >
      {/* Search bar */}
      <View style={[styles.searchWrapper, { backgroundColor: c.background }]}>
        <View style={[styles.searchBar, { backgroundColor: c.surfaceSecondary }]}>
          <Ionicons name="search" size={16} color={c.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: c.textPrimary }]}
            value={search}
            onChangeText={setSearch}
            placeholder="タイトルで検索..."
            placeholderTextColor={c.textMuted}
            clearButtonMode="while-editing"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={16} color={c.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Sort controls */}
      <View style={[styles.sortBar, { backgroundColor: c.background }]}>
        {(["date", "name", "status"] as const).map((key) => {
          const active = sortKey === key;
          const labels: Record<SortKey, string> = {
            date: "日付",
            name: "名前",
            status: "ステータス",
          };
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.sortChip,
                { backgroundColor: active ? c.primaryBg : c.surfaceSecondary },
              ]}
              onPress={() => toggleSort(key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.sortChipText,
                  { color: active ? c.primary : c.textSecondary },
                ]}
              >
                {labels[key]}
              </Text>
              {active && (
                <Ionicons
                  name={sortOrder === "asc" ? "arrow-up" : "arrow-down"}
                  size={12}
                  color={c.primary}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List */}
      {filteredItems.length === 0 ? (
        <EmptyState color={c} />
      ) : (
        <SectionList
          sections={sections}
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
          renderSectionHeader={({ section: { title, data } }) => (
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionBadge, { backgroundColor: c.primaryBg }]}>
                <Text style={[styles.sectionText, { color: c.primary }]}>{title}</Text>
              </View>
              <Text style={[styles.sectionCount, { color: c.textMuted }]}>
                {data.length}件
              </Text>
            </View>
          )}
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

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: c.primary }]}
        onPress={openCreateForm}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Form modal */}
      <RecordingFormModal
        visible={formVisible}
        editingItem={editingItem}
        formData={formData}
        saving={formSaving}
        onUpdateField={updateFormField}
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

  // Search
  searchWrapper: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },

  // Sort controls
  sortBar: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingBottom: 8,
    gap: 8,
  },
  sortChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  sortChipText: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Section header
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  sectionText: {
    fontSize: 12,
    fontWeight: "600",
  },
  sectionCount: {
    fontSize: 12,
  },

  // FAB
  fab: {
    position: "absolute",
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
