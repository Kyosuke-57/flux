import { useState, useEffect, useCallback, useRef } from "react";
import { Alert } from "react-native";
import { useAuth } from "../../../../src/contexts/AuthContext";
import { useToast } from "../../../../src/contexts/ToastContext";
import {
  getAllExports,
  createExport,
  updateExport,
  deleteExport,
} from "../../../../src/services/exports";
import type { ExportItem } from "../../../../src/types";

// ─── カスタムフック ─────────────────────────────────────────

export function useExportsData() {
  const { user } = useAuth();
  const toast = useToast();

  // ── データ状態 ──
  const [exports, setExports] = useState<ExportItem[]>([]);

  // ── UI状態 ──
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<"created_at" | "title">("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── モーダル状態 ──
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [editingExport, setEditingExport] = useState<ExportItem | null>(null);

  // ── 削除取り消し用Ref ──
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deletedExportRef = useRef<ExportItem | null>(null);

  // ── データ取得 ──
  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const { data } = await getAllExports();
    if (data) setExports(data);
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

  const handleSort = useCallback((field: "created_at" | "title") => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDirection("desc");
      return field;
    });
  }, []);

  // ── 検索フィルタリング + ソート ──
  const filteredExports = (() => {
    const filtered = search.trim()
      ? exports.filter(
          (e) =>
            e.title.toLowerCase().includes(search.toLowerCase()) ||
            e.format.toLowerCase().includes(search.toLowerCase()),
        )
      : exports;

    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortField === "title") {
        cmp = a.title.localeCompare(b.title, "ja");
      } else {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
  })();

  // ── モーダルを開く（作成） ──
  const handleOpenCreate = useCallback(() => {
    setEditingExport(null);
    setFormModalVisible(true);
  }, []);

  // ── モーダルを開く（編集） ──
  const handleOpenEdit = useCallback((exp: ExportItem) => {
    setEditingExport(exp);
    setFormModalVisible(true);
  }, []);

  // ── モーダルを閉じる ──
  const handleCloseForm = useCallback(() => {
    setFormModalVisible(false);
    setEditingExport(null);
  }, []);

  // ── 保存（新規作成／更新） ──
  const handleSave = useCallback(
    async (title: string, format: "txt" | "md" | "pdf", minute_id?: string) => {
      if (!title.trim()) return;

      if (editingExport) {
        const { data } = await updateExport(editingExport.id, {
          title: title.trim(),
          format,
          minute_id,
        });
        if (data) {
          setExports((prev) =>
            prev.map((e) => (e.id === data.id ? data : e)),
          );
          toast.showToast({ message: "エクスポートを更新しました", type: "success" });
        }
      } else {
        const { data } = await createExport(title.trim(), format, minute_id);
        if (data) {
          setExports((prev) => [...prev, data]);
          toast.showToast({ message: "エクスポートを作成しました", type: "success" });
        }
      }

      setFormModalVisible(false);
      setEditingExport(null);
    },
    [editingExport, toast],
  );

  // ── 削除（取り消し可能） ──
  const handleDelete = useCallback(
    (id: string) => {
      const target = exports.find((e) => e.id === id);
      if (!target) return;

      Alert.alert("エクスポートを削除", `「${target.title}」を削除してもよろしいですか？`, [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除",
          style: "destructive",
          onPress: () => {
            deletedExportRef.current = target;
            setExports((prev) => prev.filter((e) => e.id !== id));
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
                if (deletedExportRef.current) {
                  setExports((prev) => [...prev, deletedExportRef.current!]);
                  deletedExportRef.current = null;
                }
              },
              onAutoHide: async () => {
                if (deletedExportRef.current) {
                  await deleteExport(deletedExportRef.current.id);
                  deletedExportRef.current = null;
                }
              },
            });
          },
        },
      ]);
    },
    [toast, exports],
  );

  return {
    exports,
    filteredExports,
    search,
    sortField,
    sortDirection,
    loading,
    refreshing,
    formModalVisible,
    editingExport,

    setSearch,

    fetchData,
    onRefresh,
    handleSort,
    handleOpenCreate,
    handleOpenEdit,
    handleCloseForm,
    handleSave,
    handleDelete,
  };
}
