import { useState, useEffect, useCallback, useRef } from "react";
import { Alert } from "react-native";
import { useAuth } from "../../../../src/contexts/AuthContext";
import { useToast } from "../../../../src/contexts/ToastContext";
import {
  getAllMinutes,
  searchMinutes,
  deleteMinute,
} from "../../../../src/services/minutes";
import { getAllTags } from "../../../../src/services/tags";
import { getAllFolders, createFolder } from "../../../../src/services/folders";
import type { Minute, Tag, Folder } from "../../../../src/types";

// ─── 型定義 ────────────────────────────────────────────────

export type SortOption = "newest" | "oldest" | "title";

export type Section = {
  title: string;
  folderId: string | null;
  data: Minute[];
};

// ─── ユーティリティ関数 ─────────────────────────────────────

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getPreview(content: string): string {
  const stripped = content.replace(/[#*`\[\]]/g, "").trim();
  return stripped.length > 100
    ? stripped.slice(0, 100) + "…"
    : stripped;
}

export function getTagName(tagId: string, tags: Tag[]): string {
  const found = tags.find((t) => t.id === tagId);
  return found ? found.name : tagId;
}

export function getFolderName(folderId: string | null, folders: Folder[]): string | null {
  if (!folderId) return null;
  return folders.find((f) => f.id === folderId)?.name ?? null;
}

// ─── カスタムフック ─────────────────────────────────────────

export function useMinutesData() {
  const { user } = useAuth();
  const toast = useToast();

  // ── データ状態 ──
  const [minutes, setMinutes] = useState<Minute[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);

  // ── UI状態 ──
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [folderModalVisible, setFolderModalVisible] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  // ── 選択モード ──
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── Ref ──
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deletedMinuteRef = useRef<Minute | null>(null);

  // ── データ取得 ──
  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const [{ data: minutesData }, { data: tagsData }, { data: foldersData }] =
      await Promise.all([getAllMinutes(), getAllTags(), getAllFolders()]);
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

  // ── 検索 ──
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

  // ── 削除（単一・取り消し可能） ──
  const handleDelete = useCallback(
    (id: string) => {
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
    },
    [toast, minutes],
  );

  // ── ロングプレス（選択モード開始） ──
  const handleLongPress = useCallback(
    (item: Minute) => {
      if (selectMode) return;
      setSelectMode(true);
      setSelectedIds(new Set([item.id]));
    },
    [selectMode],
  );

  // ── 選択トグル ──
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ── 一括削除 ──
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
            toast.showToast({
              message: `${selectedIds.size} 件削除しました`,
              type: "success",
            });
          },
        },
      ],
    );
  }, [selectedIds, toast]);

  // ── フォルダ作成 ──
  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim()) return;
    const { data } = await createFolder(newFolderName.trim());
    if (data) setFolders((prev) => [...prev, data]);
    setFolderModalVisible(false);
    setNewFolderName("");
  }, [newFolderName]);

  // ── フィルタリング・ソート ──
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
        sorted.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        break;
      case "oldest":
        sorted.sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );
        break;
      case "title":
        sorted.sort((a, b) => a.title.localeCompare(b.title, "ja"));
        break;
    }
    return sorted;
  };

  // ── セクション構築 ──
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
      sections.push({
        title: folder.name,
        folderId: folder.id,
        data: sortMinutes(items),
      });
      folderMap.delete(folder.id);
    }
  }
  const uncategorized = folderMap.get("__none__") ?? [];
  if (uncategorized.length > 0) {
    sections.push({
      title: "その他",
      folderId: null,
      data: sortMinutes(uncategorized),
    });
  }

  const isShowingAll = !selectedFolderId && !selectedTag;

  // ── 戻り値 ──
  return {
    // データ
    minutes,
    tags,
    folders,
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

    // セッター
    setSearch,
    setSelectedTag,
    setSelectedFolderId,
    setSortBy,
    setSelectMode,
    setSelectedIds,
    setFolderModalVisible,
    setNewFolderName,

    // アクション
    handleSearch,
    handleDelete,
    handleLongPress,
    toggleSelect,
    handleBulkDelete,
    handleCreateFolder,
    fetchData,
    onRefresh,

    // 導出値
    sections,
    isShowingAll,
  };
}
