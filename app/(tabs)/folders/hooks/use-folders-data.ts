import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Alert } from "react-native";
import { useAuth } from "../../../../src/contexts/AuthContext";
import { useToast } from "../../../../src/contexts/ToastContext";
import { getAllFolders, createFolder, updateFolder, deleteFolder } from "../../../../src/services/folders";
import type { Folder } from "../../../../src/types";

// ─── ソート型 ──────────────────────────────────────────────

export type SortBy = "date" | "name" | "status";
export type SortOrder = "asc" | "desc";

// ─── カスタムフック ─────────────────────────────────────────

export function useFoldersData() {
  const { user } = useAuth();
  const toast = useToast();

  // ── データ状態 ──
  const [folders, setFolders] = useState<Folder[]>([]);

  // ── UI状態 ──
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── ソート状態 ──
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // ── モーダル状態 ──
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);

  // ── 削除取り消し用Ref ──
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deletedFolderRef = useRef<Folder | null>(null);

  // ── データ取得 ──
  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const { data } = await getAllFolders();
    if (data) setFolders(data);
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

  // ── 検索フィルタリング & ソート ──
  const filteredFolders = useMemo(() => {
    const filtered = search.trim()
      ? folders.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))
      : folders;

    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case "date":
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "name":
          cmp = a.name.localeCompare(b.name, "ja");
          break;
        case "status":
          // フォルダに status フィールドはないため updated_at で代用
          cmp = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          break;
      }
      return sortOrder === "desc" ? -cmp : cmp;
    });
  }, [folders, search, sortBy, sortOrder]);

  // ── モーダルを開く（作成） ──
  const handleOpenCreate = useCallback(() => {
    setEditingFolder(null);
    setFormModalVisible(true);
  }, []);

  // ── モーダルを開く（編集） ──
  const handleOpenEdit = useCallback((folder: Folder) => {
    setEditingFolder(folder);
    setFormModalVisible(true);
  }, []);

  // ── モーダルを閉じる ──
  const handleCloseForm = useCallback(() => {
    setFormModalVisible(false);
    setEditingFolder(null);
  }, []);

  // ── 保存（新規作成／更新） ──
  const handleSave = useCallback(
    async (name: string, color?: string) => {
      if (!name.trim()) return;

      if (editingFolder) {
        // 更新
        const { data } = await updateFolder(editingFolder.id, { name: name.trim(), color });
        if (data) {
          setFolders((prev) => prev.map((f) => (f.id === data.id ? data : f)));
          toast.showToast({ message: "フォルダを更新しました", type: "success" });
        }
      } else {
        // 新規作成
        const { data } = await createFolder(name.trim());
        if (data) {
          setFolders((prev) => [...prev, data]);
          toast.showToast({ message: "フォルダを作成しました", type: "success" });
        }
      }

      setFormModalVisible(false);
      setEditingFolder(null);
    },
    [editingFolder, toast],
  );

  // ── 削除（取り消し可能） ──
  const handleDelete = useCallback(
    (id: string) => {
      Alert.alert("フォルダを削除", "このフォルダを削除してもよろしいですか？", [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除",
          style: "destructive",
          onPress: () => {
            const target = folders.find((f) => f.id === id);
            if (!target) return;
            deletedFolderRef.current = target;
            setFolders((prev) => prev.filter((f) => f.id !== id));
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
                if (deletedFolderRef.current) {
                  setFolders((prev) => [...prev, deletedFolderRef.current!]);
                  deletedFolderRef.current = null;
                }
              },
              onAutoHide: async () => {
                if (deletedFolderRef.current) {
                  await deleteFolder(deletedFolderRef.current.id);
                  deletedFolderRef.current = null;
                }
              },
            });
          },
        },
      ]);
    },
    [toast, folders],
  );

  return {
    // データ
    folders,
    filteredFolders,
    search,
    loading,
    refreshing,
    formModalVisible,
    editingFolder,

    // ソート状態
    sortBy,
    sortOrder,

    // セッター
    setSearch,
    setSortBy,
    setSortOrder,

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
