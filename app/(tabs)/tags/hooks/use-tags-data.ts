import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Alert } from "react-native";
import { useAuth } from "../../../../src/contexts/AuthContext";
import { useToast } from "../../../../src/contexts/ToastContext";
import { getAllTags, createTag, updateTag, deleteTag } from "../../../../src/services/tags";
import type { Tag, TagStatus } from "../../../../src/types";
import type { SortBy, SortOrder } from "../components/sort-controls";

// ─── カスタムフック ─────────────────────────────────────────

export function useTagsData() {
  const { user } = useAuth();
  const toast = useToast();

  // ── データ状態 ──
  const [tags, setTags] = useState<Tag[]>([]);

  // ── UI状態 ──
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── ソート状態 ──
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // ── モーダル状態 ──
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);

  // ── 削除取り消し用Ref ──
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deletedTagRef = useRef<Tag | null>(null);

  // ── データ取得 ──
  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const { data } = await getAllTags();
    if (data) setTags(data);
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

  // ── 検索フィルタリング ──
  const filteredBySearch = useMemo(
    () =>
      search.trim()
        ? tags.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
        : tags,
    [tags, search],
  );

  // ── ソート ──
  const statusOrder: Record<TagStatus, number> = { active: 0, archived: 1 };

  const sortedTags = useMemo(() => {
    const sorted = [...filteredBySearch];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case "date":
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "name":
          cmp = a.name.localeCompare(b.name, "ja");
          break;
        case "status":
          cmp = statusOrder[a.status] - statusOrder[b.status];
          break;
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [filteredBySearch, sortBy, sortOrder]);

  const handleSortByChange = useCallback((by: SortBy) => {
    setSortBy(by);
  }, []);

  const handleSortOrderToggle = useCallback(() => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  }, []);

  // ── モーダルを開く（作成） ──
  const handleOpenCreate = useCallback(() => {
    setEditingTag(null);
    setFormModalVisible(true);
  }, []);

  // ── モーダルを開く（編集） ──
  const handleOpenEdit = useCallback((tag: Tag) => {
    setEditingTag(tag);
    setFormModalVisible(true);
  }, []);

  // ── モーダルを閉じる ──
  const handleCloseForm = useCallback(() => {
    setFormModalVisible(false);
    setEditingTag(null);
  }, []);

  // ── 保存（新規作成／更新） ──
  const handleSave = useCallback(
    async (name: string, color?: string) => {
      if (!name.trim()) return;

      if (editingTag) {
        // 更新
        const { data } = await updateTag(editingTag.id, { name: name.trim(), color });
        if (data) {
          setTags((prev) => prev.map((t) => (t.id === data.id ? data : t)));
          toast.showToast({ message: "タグを更新しました", type: "success" });
        }
      } else {
        // 新規作成
        const { data } = await createTag(name.trim(), color);
        if (data) {
          setTags((prev) => [...prev, data]);
          toast.showToast({ message: "タグを作成しました", type: "success" });
        }
      }

      setFormModalVisible(false);
      setEditingTag(null);
    },
    [editingTag, toast],
  );

  // ── 削除（取り消し可能） ──
  const handleDelete = useCallback(
    (id: string) => {
      Alert.alert("タグを削除", "このタグを削除してもよろしいですか？", [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除",
          style: "destructive",
          onPress: () => {
            const target = tags.find((t) => t.id === id);
            if (!target) return;
            deletedTagRef.current = target;
            setTags((prev) => prev.filter((t) => t.id !== id));
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
                if (deletedTagRef.current) {
                  setTags((prev) => [...prev, deletedTagRef.current!]);
                  deletedTagRef.current = null;
                }
              },
              onAutoHide: async () => {
                if (deletedTagRef.current) {
                  await deleteTag(deletedTagRef.current.id);
                  deletedTagRef.current = null;
                }
              },
            });
          },
        },
      ]);
    },
    [toast, tags],
  );

  return {
    // データ
    tags,
    filteredTags: sortedTags,
    search,
    loading,
    refreshing,
    formModalVisible,
    editingTag,

    // ソート状態
    sortBy,
    sortOrder,

    // セッター
    setSearch,

    // ソートアクション
    handleSortByChange,
    handleSortOrderToggle,

    // アクション
    fetchData,
    onRefresh,
    handleOpenCreate,
    handleOpenEdit,
    handleCloseForm,
    handleSave,
    handleDelete,
  };
}
