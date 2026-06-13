import { useState, useEffect, useCallback, useMemo } from "react";
import { Alert } from "react-native";
import { useAuth } from "../../../../src/contexts/AuthContext";
import { useToast } from "../../../../src/contexts/ToastContext";
import {
  getAllRecordings,
  createRecording,
  updateRecording,
  deleteRecording,
} from "../../../../src/services/recordings";
import type { Recording } from "../../../../src/types";
import { filterRecordings } from "./utils";

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

export function useRecordingData() {
  const { user } = useAuth();
  const toast = useToast();

  const [items, setItems] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = useMemo(
    () => filterRecordings(items, searchQuery),
    [items, searchQuery],
  );

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
    if (!formData.title.trim() || !formData.file_path.trim()) {
      toast.showToast({ message: "タイトルとファイルパスは必須です", type: "error" });
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
    if (!formData.title.trim() || !formData.file_path.trim()) {
      toast.showToast({ message: "タイトルとファイルパスは必須です", type: "error" });
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

  return {
    // データ
    items,
    filteredItems,
    loading,
    refreshing,

    // 検索
    searchQuery,
    setSearchQuery,

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
