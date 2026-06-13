import { useState, useEffect, useCallback, useMemo } from "react";
import { Alert } from "react-native";
import { useAuth } from "../../../../src/contexts/AuthContext";
import { useToast } from "../../../../src/contexts/ToastContext";
import {
  getAllTranscriptionJobs,
  createTranscriptionJob,
  updateTranscriptionJob,
  deleteTranscriptionJob,
} from "../../../../src/services/transcription-jobs";
import type { TranscriptionJob } from "../../../../src/types";
import { sortJobsBy, sortJobs } from "./utils";
import type { SortField, SortOrder } from "./utils";

export type JobFormData = {
  file_name: string;
  r2_key: string;
  recording_id: string;
  file_size: string; // 編集用に文字列で保持
  status: TranscriptionJob["status"];
};

const INITIAL_FORM: JobFormData = {
  file_name: "",
  r2_key: "",
  recording_id: "",
  file_size: "0",
  status: "queued",
};

export function useR2UploadData() {
  const { user } = useAuth();
  const toast = useToast();

  const [items, setItems] = useState<TranscriptionJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 検索
  const [searchQuery, setSearchQuery] = useState("");

  // ソート
  const [sortBy, setSortBy] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const filteredItems = useMemo(() => {
    // 1. 検索フィルター
    let result = items;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = items.filter(
        (item) =>
          item.file_name.toLowerCase().includes(q) ||
          item.r2_key.toLowerCase().includes(q),
      );
    }
    // 2. ソート
    return sortJobsBy(result, sortBy, sortOrder);
  }, [items, searchQuery, sortBy, sortOrder]);

  // フォームモーダル状態
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<TranscriptionJob | null>(null);
  const [formData, setFormData] = useState<JobFormData>(INITIAL_FORM);

  // ── データ取得 ──

  const fetchData = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const { data } = await getAllTranscriptionJobs();
    if (data) setItems(sortJobs(data));
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

  // ── フォーム操作 ──

  const openCreateForm = useCallback(() => {
    setEditingItem(null);
    setFormData(INITIAL_FORM);
    setFormModalVisible(true);
  }, []);

  const openEditForm = useCallback((item: TranscriptionJob) => {
    setEditingItem(item);
    setFormData({
      file_name: item.file_name,
      r2_key: item.r2_key,
      recording_id: item.recording_id,
      file_size: String(item.file_size),
      status: item.status,
    });
    setFormModalVisible(true);
  }, []);

  const closeForm = useCallback(() => {
    setFormModalVisible(false);
    setEditingItem(null);
    setFormData(INITIAL_FORM);
  }, []);

  const updateFormField = useCallback(
    <K extends keyof JobFormData>(field: K, value: JobFormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  // ── 作成 ──

  const handleCreate = useCallback(async () => {
    if (!formData.file_name.trim() || !formData.r2_key.trim()) {
      toast.showToast({ message: "ファイル名とR2キーは必須です", type: "error" });
      return;
    }

    const { data, error } = await createTranscriptionJob({
      recording_id: formData.recording_id || formData.r2_key,
      r2_key: formData.r2_key.trim(),
      file_name: formData.file_name.trim(),
      file_size: Math.max(0, parseInt(formData.file_size, 10) || 0),
      status: formData.status,
    });

    if (error) {
      toast.showToast({ message: "作成に失敗しました", type: "error" });
      return;
    }
    if (data) {
      setItems((prev) => sortJobs([data, ...prev]));
    }
    toast.showToast({ message: "作成しました", type: "success" });
    closeForm();
  }, [formData, toast, closeForm]);

  // ── 更新 ──

  const handleUpdate = useCallback(async () => {
    if (!editingItem) return;
    if (!formData.file_name.trim() || !formData.r2_key.trim()) {
      toast.showToast({ message: "ファイル名とR2キーは必須です", type: "error" });
      return;
    }

    const { data, error } = await updateTranscriptionJob(editingItem.id, {
      file_name: formData.file_name.trim(),
      r2_key: formData.r2_key.trim(),
      recording_id: formData.recording_id || formData.r2_key.trim(),
      file_size: Math.max(0, parseInt(formData.file_size, 10) || 0),
      status: formData.status,
    });

    if (error) {
      toast.showToast({ message: "更新に失敗しました", type: "error" });
      return;
    }
    if (data) {
      setItems((prev) => sortJobs(prev.map((i) => (i.id === data.id ? data : i))));
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
        "R2アップロードを削除",
        `「${target.file_name}」を削除してもよろしいですか？`,
        [
          { text: "キャンセル", style: "cancel" },
          {
            text: "削除",
            style: "destructive",
            onPress: async () => {
              setItems((prev) => prev.filter((i) => i.id !== id));
              await deleteTranscriptionJob(id);
              toast.showToast({ message: "削除しました", type: "success" });
            },
          },
        ],
      );
    },
    [items, toast],
  );

  return {
    // データ
    items,
    filteredItems,
    loading,
    refreshing,

    // 検索
    searchQuery,
    setSearchQuery,

    // ソート
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,

    // フォーム
    formModalVisible,
    editingItem,
    formData,

    // アクション（一覧）
    onRefresh,
    openCreateForm,
    openEditForm,
    handleDelete,

    // アクション（フォーム）
    closeForm,
    updateFormField,
    handleCreate,
    handleUpdate,
  };
}
