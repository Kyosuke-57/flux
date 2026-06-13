import { useState, useEffect, useCallback, useMemo } from "react";
import { Alert } from "react-native";
import { useAuth } from "../../../../src/contexts/AuthContext";
import { useToast } from "../../../../src/contexts/ToastContext";
import {
  getAllRecordings,
  createRecording,
  updateRecording,
  deleteRecording,
  searchRecordings,
} from "../../../../src/services/recordings";
import type { Recording } from "../../../../src/types";
import { sortRecordings, type SortField, type SortDirection } from "./utils";

export type RecordingFormData = {
  title: string;
  file_path: string;
  duration_seconds: string; // 編集用に文字列で保持
  transcribed: boolean;
};

const INITIAL_FORM: RecordingFormData = {
  title: "",
  file_path: "",
  duration_seconds: "0",
  transcribed: false,
};

export function useStorageData() {
  const { user } = useAuth();
  const toast = useToast();

  const [items, setItems] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // フォームモーダル状態
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<Recording | null>(null);
  const [formData, setFormData] = useState<RecordingFormData>(INITIAL_FORM);

  // ── データ取得 ──

  const fetchData = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const { data } = await getAllRecordings();
    if (data) setItems(data);
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
      const { data } = await getAllRecordings();
      if (data) setItems(data);
      return;
    }
    const { data } = await searchRecordings(query);
    if (data) setItems(data);
  }, []);

  // ── フォーム操作 ──

  const openCreateForm = useCallback(() => {
    setEditingItem(null);
    setFormData(INITIAL_FORM);
    setFormModalVisible(true);
  }, []);

  const openEditForm = useCallback((item: Recording) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      file_path: item.file_path,
      duration_seconds: String(item.duration_seconds),
      transcribed: item.transcribed,
    });
    setFormModalVisible(true);
  }, []);

  const closeForm = useCallback(() => {
    setFormModalVisible(false);
    setEditingItem(null);
    setFormData(INITIAL_FORM);
  }, []);

  const updateFormField = useCallback(
    <K extends keyof RecordingFormData>(field: K, value: RecordingFormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  // ── 作成 ──

  const handleCreate = useCallback(async () => {
    if (!formData.title.trim()) {
      toast.showToast({ message: "タイトルは必須です", type: "error" });
      return;
    }

    const { data, error } = await createRecording({
      title: formData.title.trim(),
      file_path: formData.file_path.trim(),
      duration_seconds: Math.max(0, parseInt(formData.duration_seconds, 10) || 0),
      transcribed: formData.transcribed,
    });

    if (error) {
      toast.showToast({ message: "作成に失敗しました", type: "error" });
      return;
    }
    if (data) {
      setItems((prev) => [data, ...prev]);
    }
    toast.showToast({ message: "作成しました", type: "success" });
    closeForm();
  }, [formData, toast, closeForm]);

  // ── 更新 ──

  const handleUpdate = useCallback(async () => {
    if (!editingItem) return;
    if (!formData.title.trim()) {
      toast.showToast({ message: "タイトルは必須です", type: "error" });
      return;
    }

    const { data, error } = await updateRecording(editingItem.id, {
      title: formData.title.trim(),
      file_path: formData.file_path.trim(),
      duration_seconds: Math.max(0, parseInt(formData.duration_seconds, 10) || 0),
      transcribed: formData.transcribed,
    });

    if (error) {
      toast.showToast({ message: "更新に失敗しました", type: "error" });
      return;
    }
    if (data) {
      setItems((prev) => prev.map((i) => (i.id === data.id ? data : i)));
    }
    toast.showToast({ message: "更新しました", type: "success" });
    closeForm();
  }, [editingItem, formData, toast, closeForm]);

  // ── 削除 ──

  const handleDelete = useCallback(
    (id: string) => {
      const target = items.find((i) => i.id === id);
      if (!target) return;
      Alert.alert(
        "録音データを削除",
        `「${target.title}」を削除してもよろしいですか？`,
        [
          { text: "キャンセル", style: "cancel" },
          {
            text: "削除",
            style: "destructive",
            onPress: async () => {
              setItems((prev) => prev.filter((i) => i.id !== id));
              await deleteRecording(id);
              toast.showToast({ message: "削除しました", type: "success" });
            },
          },
        ],
      );
    },
    [items, toast],
  );

  // ── ソート ──

  const handleSort = useCallback((field: SortField) => {
    setSortField((prevField) => {
      if (prevField === field) {
        // 同じフィールド → 昇順/降順をトグル
        setSortDirection((prevDir) => (prevDir === "asc" ? "desc" : "asc"));
        return prevField;
      }
      // 別のフィールド → 降順で設定
      setSortDirection("desc");
      return field;
    });
  }, []);

  const sortedItems = useMemo(
    () => sortRecordings(items, sortField, sortDirection),
    [items, sortField, sortDirection],
  );

  return {
    // データ
    items: sortedItems,
    sortField,
    sortDirection,
    loading,
    refreshing,
    search,

    // フォーム
    formModalVisible,
    editingItem,
    formData,

    // アクション（一覧）
    setSearch,
    onRefresh,
    handleSearch,
    openCreateForm,
    openEditForm,
    handleDelete,
    handleSort,

    // アクション（フォーム）
    closeForm,
    updateFormField,
    handleCreate,
    handleUpdate,
  };
}
