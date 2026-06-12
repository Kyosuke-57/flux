import { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  ActivityIndicator, RefreshControl, Alert, Modal, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/contexts/AuthContext";
import { getAllMinutes, searchMinutes, deleteMinute, duplicateMinute } from "../../src/services/minutes";
import { getAllTags } from "../../src/services/tags";
import { getAllFolders, createFolder } from "../../src/services/folders";
import type { Minute, Tag, Folder } from "../../src/types";
import { theme, Spacing, BorderRadius } from "../../src/theme";
import { useSettings } from "../../src/contexts/SettingsContext";
import { useToast } from "../../src/contexts/ToastContext";
import { SwipeableRow } from "../../src/animations/gestures";
import { Skeleton, MinutesListSkeleton } from "../../src/components/Skeleton";
import { HighlightedText } from "../../src/components/HighlightedText";
import { GlassCard } from "../../src/components/Glass";

type SortOption = "newest" | "oldest" | "title";

type Section = {
  title: string;
  folderId: string | null;
  data: Minute[];
};

export default function MinutesScreen() {
  const { settings } = useSettings();
  const c = theme(settings.isDarkMode);
  const { user } = useAuth();
  const [minutes, setMinutes] = useState<Minute[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [folderModalVisible, setFolderModalVisible] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const toast = useToast();

  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const [{ data: minutesData }, { data: tagsData }, { data: foldersData }] = await Promise.all([
      getAllMinutes(),
      getAllTags(),
      getAllFolders(),
    ]);
    if (minutesData) setMinutes(minutesData);
    if (tagsData) setTags(tagsData);
    if (foldersData) setFolders(foldersData);
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deletedMinuteRef = useRef<Minute | null>(null);

  const handleDelete = useCallback((id: string) => {
    Alert.alert("議事録を削除", "この議事録を削除してもよろしいですか？", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: () => {
          const target = minutes.find((m) => m.id === id);
          if (!target) return;
          deletedMinuteRef.current = target;
          setMinutes((prev) => prev.filter((m) => m.id !== id));
          toast.showToast({
            message: "削除しました",
            type: "success",
            duration: 4000,
            actionLabel: "取り消し",
            onAction: () => {
              if (deleteTimerRef.current) {
                clearTimeout(deleteTimerRef.current);
                deleteTimerRef.current = null;
              }
              if (deletedMinuteRef.current) {
                setMinutes((prev) => [deletedMinuteRef.current!, ...prev]);
                deletedMinuteRef.current = null;
              }
            },
            onAutoHide: async () => {
              if (deletedMinuteRef.current) {
                await deleteMinute(deletedMinuteRef.current.id);
                deletedMinuteRef.current = null;
              }
            },
          });
        },
      },
    ]);
  }, [toast, minutes]);

  const handleSearch = useCallback(async (query: string) => {
    setSearch(query);
    if (!query.trim()) {
      const { data } = await getAllMinutes();
      if (data) setMinutes(data);
      return;
    }
    const { data } = await searchMinutes(query);
    if (data) setMinutes(data);
  }, []);

  const handleLongPress = useCallback((item: Minute) => {
    if (selectMode) return;
    setSelectMode(true);
    setSelectedIds(new Set([item.id]));
  }, [selectMode]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleBulkDelete = useCallback(() => {
    if (selectedIds.size === 0) return;
    Alert.alert(
      "一括削除",
      `選択した ${selectedIds.size} 件の議事録を削除しますか？この操作は元に戻せません。`,
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除",
          style: "destructive",
          onPress: async () => {
            for (const id of selectedIds) {
              await deleteMinute(id);
            }
            setMinutes((prev) => prev.filter((m) => !selectedIds.has(m.id)));
            setSelectMode(false);
            setSelectedIds(new Set());
            toast.showToast({ message: `${selectedIds.size} 件削除しました`, type: "success" });
          },
        },
      ],
    );
  }, [selectedIds, toast]);

  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim()) return;
    const { data } = await createFolder(newFolderName.trim());
    if (data) setFolders((prev) => [...prev, data]);
    setFolderModalVisible(false);
    setNewFolderName("");
  }, [newFolderName]);

  const filteredByTag = selectedTag
    ? minutes.filter((m) => {
        const tagName = tags.find((t) => t.id === selectedTag)?.name;
        return tagName && m.tags?.includes(tagName);
      })
    : minutes;
  const filteredByFolder = selectedFolderId
    ? filteredByTag.filter((m) => m.folder_id === selectedFolderId)
    : filteredByTag;

  const sortMinutes = (list: Minute[]) => {
    const sorted = [...list];
    switch (sortBy) {
      case "newest":
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "oldest":
        sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case "title":
        sorted.sort((a, b) => a.title.localeCompare(b.title, "ja"));
        break;
    }
    return sorted;
  };

  const sections: Section[] = [];
  const folderMap = new Map<string | null, Minute[]>();
  for (const m of filteredByFolder) {
    const key = m.folder_id ?? "__none__";
    if (!folderMap.has(key)) folderMap.set(key, []);
    folderMap.get(key)!.push(m);
  }
  for (const folder of folders) {
    const items = folderMap.get(folder.id) ?? [];
    if (items.length > 0) {
      sections.push({ title: folder.name, folderId: folder.id, data: sortMinutes(items) });
      folderMap.delete(folder.id);
    }
  }
  const uncategorized = folderMap.get("__none__") ?? [];
  if (uncategorized.length > 0) {
    sections.push({ title: "その他", folderId: null, data: sortMinutes(uncategorized) });
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPreview = (content: string) => {
    const stripped = content.replace(/[#*`\[\]]/g, "").trim();
    return stripped.length > 100
      ? stripped.slice(0, 100) + "…"
      : stripped;
  };

  const getTagName = (tagId: string) => {
    const found = tags.find((t) => t.id === tagId);
    return found ? found.name : tagId;
  };

  const getFolderName = (folderId: string | null) => {
    if (!folderId) return null;
    return folders.find((f) => f.id === folderId)?.name ?? null;
  };

  const isShowingAll = !selectedFolderId && !selectedTag;

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={["top", "left", "right"]}>
        <Text style={[styles.title, { color: c.textPrimary }]}>議事録</Text>
        <View style={[styles.searchWrapper, { backgroundColor: c.surface, borderColor: c.border, marginTop: 12, marginHorizontal: 24 }]}>
          <Skeleton width={18} height={18} borderRadius={9} />
          <Skeleton width="100%" height={18} borderRadius={6} style={{ flex: 1 }} />
        </View>
        <MinutesListSkeleton />
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={["top", "left", "right"]}>
        <View style={styles.centered}>
          <Text style={[styles.emptyTitle, { color: c.textPrimary }]}>サインインしてください</Text>
          <Text style={[styles.emptySubtext, { color: c.textSecondary }]}>
            議事録の表示・管理にはログインが必要です。
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={["top", "left", "right"]}>
      {selectMode ? (
        /* ─── 選択モードヘッダー ─── */
        <View style={[styles.selectHeader, { backgroundColor: c.surface, borderBottomColor: c.divider }]}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => { setSelectMode(false); setSelectedIds(new Set()); }}
          >
            <Text style={[styles.headerAction, { color: c.primary }]}>キャンセル</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: c.textPrimary }]}>
            {selectedIds.size} 件選択
          </Text>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => {
              const allIds = sections.flatMap((s) => s.data).map((m) => m.id);
              if (selectedIds.size === allIds.length) {
                setSelectedIds(new Set());
              } else {
                setSelectedIds(new Set(allIds));
              }
            }}
          >
            <Text style={[styles.headerAction, { color: c.primary }]}>
              {selectedIds.size === sections.flatMap((s) => s.data).length ? "解除" : "すべて選択"}
            </Text>
          </TouchableOpacity>
          {selectedIds.size > 0 && (
            <TouchableOpacity style={styles.selectDeleteBtn} onPress={handleBulkDelete}>
              <Ionicons name="trash-outline" size={20} color={c.error} />
            </TouchableOpacity>
          )}
        </View>
      ) : null}

      {/* ─── 検索バー ─── */}
      <View style={[styles.searchWrapper, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Ionicons name="search" size={18} color={c.textMuted} />
        <TextInput
          style={[styles.search, { color: c.textPrimary }]}
          placeholder="検索…"
          placeholderTextColor={c.textMuted}
          value={search}
          onChangeText={handleSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => handleSearch("")}>
            <Ionicons name="close-circle" size={18} color={c.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* ─── フィルター行 ─── */}
      <View style={[styles.filterWrapper, { borderBottomColor: c.divider }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        <TouchableOpacity
          style={[
            styles.filterChip,
            { backgroundColor: c.surfaceSecondary },
            isShowingAll && { backgroundColor: c.primary },
          ]}
          onPress={() => {
            setSelectedFolderId(null);
            setSelectedTag(null);
          }}
        >
          <Text style={[styles.filterChipText, { color: c.textSecondary }, isShowingAll && { color: c.textInverse, fontWeight: "600" }]}>
            すべて
          </Text>
        </TouchableOpacity>

        {folders.map((folder) => (
          <TouchableOpacity
            key={folder.id}
            style={[
              styles.filterChip,
              { backgroundColor: c.surfaceSecondary },
              selectedFolderId === folder.id && { backgroundColor: c.primary },
            ]}
            onPress={() =>
              setSelectedFolderId(selectedFolderId === folder.id ? null : folder.id)
            }
          >
            <Ionicons
              name="folder"
              size={13}
              color={selectedFolderId === folder.id ? c.textInverse : folder.color ?? c.textSecondary}
            />
            <Text style={[styles.filterChipText, { color: c.textSecondary }, selectedFolderId === folder.id && { color: c.textInverse, fontWeight: "600" }]}>
              {folder.name}
            </Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[styles.addChip, { borderColor: c.border }]}
          onPress={() => { setNewFolderName(""); setFolderModalVisible(true); }}
        >
          <Ionicons name="add" size={14} color={c.primary} />
          <Text style={[styles.addChipText, { color: c.primary }]}>フォルダ</Text>
        </TouchableOpacity>

        <View style={[styles.filterDivider, { backgroundColor: c.border }]} />

        {tags.map((tag) => (
          <TouchableOpacity
            key={tag.id}
            style={[
              styles.tagChip,
              { borderColor: c.border },
              selectedTag === tag.id && { borderColor: c.primary, backgroundColor: c.primaryBg },
            ]}
            onPress={() =>
              setSelectedTag(selectedTag === tag.id ? null : tag.id)
            }
          >
            <Text style={[styles.tagChipText, { color: c.textSecondary }, selectedTag === tag.id && { color: c.primary }]}>
              #{tag.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      </View>

      {/* ─── ソート ─── */}
      <View style={[styles.sortRow, { borderBottomColor: c.divider }]}>
        <Text style={[styles.sortLabel, { color: c.textMuted }]}>並び替え:</Text>
        {([
          { key: "newest", label: "新しい順" },
          { key: "oldest", label: "古い順" },
          { key: "title", label: "名前順" },
        ] as { key: SortOption; label: string }[]).map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[
              styles.sortChip,
              { backgroundColor: c.surfaceSecondary },
              sortBy === opt.key && { backgroundColor: c.primary },
            ]}
            onPress={() => setSortBy(opt.key)}
          >
            <Text
              style={[
                styles.sortChipText,
                { color: c.textSecondary },
                sortBy === opt.key && { color: c.textInverse, fontWeight: "600" },
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ─── 一覧 ─── */}
      {sections.length === 0 && !search ? (
        <View style={styles.centered}>
          <Text style={[styles.emptyTitle, { color: c.textPrimary }]}>
            まだ議事録がありません
          </Text>
          <Text style={[styles.emptySubtext, { color: c.textSecondary }]}>
            会議を録音して、最初の議事録を作成しましょう
          </Text>
          <TouchableOpacity
            style={[styles.recordLink, { backgroundColor: c.primary }]}
            onPress={() => router.push("/record")}
          >
            <Text style={[styles.recordLinkText, { color: c.textInverse }]}>+ 会議を録音</Text>
          </TouchableOpacity>
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.centered}>
          <Text style={[styles.emptyTitle, { color: c.textPrimary }]}>
            該当する議事録がありません
          </Text>
          <Text style={[styles.emptySubtext, { color: c.textSecondary }]}>
            検索条件を変えてみてください
          </Text>
        </View>
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
              <View style={[styles.sectionHeader, { borderBottomColor: c.divider }]}>
                <Ionicons
                  name={section.folderId ? "folder" : "folder-open-outline"}
                  size={14}
                  color={c.textMuted}
                />
                <Text style={[styles.sectionTitle, { color: c.textMuted }]}>
                  {section.title}
                </Text>
                <View style={[styles.sectionCountBadge, { backgroundColor: c.surfaceSecondary }]}>
                  <Text style={[styles.sectionCount, { color: c.textSecondary }]}>
                    {section.data.length}
                  </Text>
                </View>
              </View>
              {section.data.map((item) => {
                const isSelected = selectedIds.has(item.id);
                return (
                <SwipeableRow key={item.id} onDelete={() => handleDelete(item.id)}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      if (selectMode) {
                        toggleSelect(item.id);
                      } else {
                        router.push(`/minute/${item.id}`);
                      }
                    }}
                    onLongPress={() => handleLongPress(item)}
                    delayLongPress={500}
                  >
                    <GlassCard intensity={25} style={[styles.card, isSelected && { borderColor: c.primary, borderWidth: 2 }]}>
                      <View style={styles.cardTop}>
                        {selectMode && (
                          <Ionicons
                            name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                            size={22}
                            color={isSelected ? c.primary : c.textMuted}
                            style={{ marginRight: 6 }}
                          />
                        )}
                        <HighlightedText
                          text={item.title}
                          highlight={search}
                          style={[styles.cardTitle, { color: c.textPrimary }]}
                          numberOfLines={1}
                        />
                        <Text style={[styles.cardDate, { color: c.textMuted }]}>
                          {formatDate(item.created_at)}
                        </Text>
                      </View>
                      <HighlightedText
                        text={getPreview(item.content)}
                        highlight={search}
                        style={[styles.cardPreview, { color: c.textSecondary }]}
                        numberOfLines={2}
                      />
                      {item.tags && item.tags.length > 0 && (
                        <View style={styles.cardTags}>
                          {item.tags.map((tagId) => (
                            <View key={tagId} style={[styles.cardTag, { backgroundColor: c.primaryBg }]}>
                              <Text style={[styles.cardTagText, { color: c.primary }]}>
                                {getTagName(tagId)}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </GlassCard>
                  </TouchableOpacity>
                </SwipeableRow>
                );
              })}
            </View>
          )}
        />
      )}

      {/* ─── フォルダ作成モーダル ─── */}
      <Modal
        visible={folderModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFolderModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: c.overlay }]}>
          <View style={[styles.createModal, { backgroundColor: c.surface }]}>
            <Text style={[styles.createModalTitle, { color: c.textPrimary }]}>新しいフォルダ</Text>
            <TextInput
              style={[styles.createModalInput, { color: c.textPrimary, borderColor: c.border, backgroundColor: c.background }]}
              value={newFolderName}
              onChangeText={setNewFolderName}
              placeholder="フォルダ名"
              placeholderTextColor={c.textMuted}
              autoFocus
            />
            <View style={styles.createModalActions}>
              <TouchableOpacity
                style={[styles.createModalCancel, { backgroundColor: c.surfaceSecondary }]}
                onPress={() => setFolderModalVisible(false)}
              >
                <Text style={[styles.createModalCancelText, { color: c.textSecondary }]}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createModalConfirm, { backgroundColor: c.primary }]}
                onPress={handleCreateFolder}
              >
                <Text style={[styles.createModalConfirmText, { color: c.textInverse }]}>作成</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  loadingText: { marginTop: 12, fontSize: 15 },

  title: {
    fontSize: 28,
    fontWeight: "700",
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  selectHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerBtn: { paddingVertical: 4 },
  headerAction: { fontSize: 16, fontWeight: "500" },
  headerTitle: { fontSize: 17, fontWeight: "600", flex: 1, textAlign: "center" },
  selectDeleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 24,
    marginTop: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  search: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
  },

  filterWrapper: {
    borderBottomWidth: 1,
  },
  filterRow: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
    alignItems: "center",
    minHeight: 52,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  filterChipText: { fontSize: 13, fontWeight: "500" },
  addChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: "dashed",
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  addChipText: { fontSize: 12, fontWeight: "500" },
  filterDivider: {
    width: 1,
    height: 20,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  tagChipText: { fontSize: 12, fontWeight: "400" },

  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
  },
  sortLabel: { fontSize: 12, fontWeight: "500", marginRight: 2 },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  sortChipText: { fontSize: 12, fontWeight: "500" },

  list: { paddingBottom: 24 },
  section: { marginTop: 2 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 24,
    paddingVertical: 8,
    marginTop: 6,
    borderBottomWidth: 1,
  },
  sectionTitle: { fontSize: 12, fontWeight: "600", letterSpacing: 0.3 },
  sectionCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  sectionCount: { fontSize: 11, fontWeight: "600" },

  emptyTitle: { fontSize: 18, fontWeight: "600", textAlign: "center" },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  recordLink: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  recordLinkText: { fontWeight: "600", fontSize: 15 },

  card: {
    marginHorizontal: 24,
    marginTop: 8,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 8,
  },
  cardTitle: { fontSize: 15, fontWeight: "600", flexShrink: 1 },
  cardDate: { fontSize: 12 },
  cardPreview: {
    fontSize: 13,
    marginTop: 6,
    lineHeight: 19,
  },
  cardTags: { flexDirection: "row", marginTop: 8, gap: 5 },
  cardTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  cardTagText: { fontSize: 10, fontWeight: "500" },

  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  createModal: {
    marginHorizontal: 40,
    borderRadius: 16,
    padding: 24,
    gap: 16,
    width: "80%",
  },
  createModalTitle: {
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
  },
  createModalInput: {
    fontSize: 15,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  createModalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  createModalCancel: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createModalCancelText: { fontSize: 14, fontWeight: "500" },
  createModalConfirm: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createModalConfirmText: { fontSize: 14, fontWeight: "600" },
});
