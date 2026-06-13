import React from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../../src/contexts/AuthContext";
import { useSettings } from "../../../src/contexts/SettingsContext";
import { theme } from "../../../src/theme";
import { useR2UploadData } from "./hooks/use-r2-upload-data";
import { R2UploadCard } from "./components/r2-upload-card";
import { R2UploadFormModal } from "./components/r2-upload-form-modal";
import { EmptyState } from "./components/empty-state";
import { LoadingSkeleton, UnauthenticatedView } from "./components/skeleton-state";

export default function R2UploadScreen() {
  const { settings } = useSettings();
  const c = theme(settings.isDarkMode);
  const { user } = useAuth();

  const {
    items,
    filteredItems,
    loading,
    refreshing,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
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
  } = useR2UploadData();

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
              <SortControl
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortByChange={setSortBy}
                onSortOrderChange={setSortOrder}
                color={c}
              />
              <View style={styles.headerRow}>
                <R2UploadHeader
                  count={filteredItems.length}
                  total={items.length}
                  onCreate={openCreateForm}
                  color={c}
                />
              </View>
            </View>
          }
          ListEmptyComponent={
            <SearchEmptyState color={c} query={searchQuery} />
          }
          renderItem={({ item }) => (
            <R2UploadCard
              item={item}
              onEdit={openEditForm}
              onDelete={handleDelete}
              color={c}
            />
          )}
        />
      )}

      {/* 作成・編集モーダル */}
      <R2UploadFormModal
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

/** 検索バー */
function SearchBar({
  value,
  onChangeText,
  color,
}: {
  value: string;
  onChangeText: (text: string) => void;
  color: ReturnType<typeof theme>;
}) {
  return (
    <View style={searchStyles.wrapper}>
      <View
        style={[
          searchStyles.inputRow,
          { backgroundColor: color.surface, borderColor: color.border },
        ]}
      >
        <Ionicons
          name="search-outline"
          size={16}
          color={color.textMuted}
          style={searchStyles.icon}
        />
        <TextInput
          style={[searchStyles.input, { color: color.textPrimary }]}
          value={value}
          onChangeText={onChangeText}
          placeholder="ファイル名またはR2キーで検索"
          placeholderTextColor={color.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={() => onChangeText("")}>
            <Ionicons
              name="close-circle"
              size={16}
              color={color.textMuted}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

/** ソートコントロール */
function SortControl({
  sortBy,
  sortOrder,
  onSortByChange,
  onSortOrderChange,
  color,
}: {
  sortBy: "date" | "name" | "status";
  sortOrder: "asc" | "desc";
  onSortByChange: (field: "date" | "name" | "status") => void;
  onSortOrderChange: (order: "asc" | "desc") => void;
  color: ReturnType<typeof theme>;
}) {
  const SORT_OPTIONS: { value: "date" | "name" | "status"; label: string }[] = [
    { value: "date", label: "日付" },
    { value: "name", label: "名前" },
    { value: "status", label: "ステータス" },
  ];

  return (
    <View style={sortControlStyles.row}>
      <View style={sortControlStyles.chips}>
        {SORT_OPTIONS.map((opt) => {
          const active = sortBy === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[
                sortControlStyles.chip,
                {
                  backgroundColor: active ? color.primary : color.surface,
                  borderColor: active ? color.primary : color.border,
                },
              ]}
              onPress={() => onSortByChange(opt.value)}
            >
              <Text
                style={[
                  sortControlStyles.chipText,
                  { color: active ? color.textInverse : color.textSecondary },
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <TouchableOpacity
        style={[
          sortControlStyles.orderBtn,
          { backgroundColor: color.surface, borderColor: color.border },
        ]}
        onPress={() =>
          onSortOrderChange(sortOrder === "asc" ? "desc" : "asc")
        }
        accessibilityLabel={sortOrder === "asc" ? "昇順" : "降順"}
      >
        <Ionicons
          name={sortOrder === "asc" ? "arrow-up" : "arrow-down"}
          size={14}
          color={color.textPrimary}
        />
        <Text style={[sortControlStyles.orderText, { color: color.textSecondary }]}>
          {sortOrder === "asc" ? "昇順" : "降順"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const sortControlStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
  },
  chips: {
    flexDirection: "row",
    gap: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  orderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  orderText: {
    fontSize: 11,
    fontWeight: "500",
  },
});

const searchStyles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 4,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
  },
  icon: {
    marginRight: 6,
  },
  input: {
    flex: 1,
    fontSize: 14,
    height: "100%",
  },
});

/** 検索結果が空のとき */
function SearchEmptyState({
  color,
  query,
}: {
  color: ReturnType<typeof theme>;
  query: string;
}) {
  return (
    <View style={emptySearchStyles.centered}>
      <Ionicons
        name="search-outline"
        size={40}
        color={color.textMuted}
      />
      <Text style={[emptySearchStyles.text, { color: color.textSecondary }]}>
        「{query}」に一致する結果がありません
      </Text>
    </View>
  );
}

const emptySearchStyles = StyleSheet.create({
  centered: {
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
  },
  text: {
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 32,
  },
});

/** ヘッダー行: 件数表示 + 新規作成ボタン */
function R2UploadHeader({
  count,
  total,
  onCreate,
  color,
}: {
  count: number;
  total: number;
  onCreate: () => void;
  color: ReturnType<typeof theme>;
}) {
  return (
    <View style={headerStyles.row}>
      <Text style={[headerStyles.count, { color: color.textSecondary }]}>
        全 {total} 件{count !== total ? `（表示 ${count} 件）` : ""}
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
