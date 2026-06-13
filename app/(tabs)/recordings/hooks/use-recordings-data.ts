import { useState, useEffect, useCallback } from "react";
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

export interface RecordingFormData {
  title: string;
  filePath: string;
  transcribed: boolean;
}

const emptyFormData: RecordingFormData = {
  title: "",
  filePath: "",
  transcribed: false,
};

export function useRecordingsData() {
  const { user } = useAuth();
  const toast = useToast();

  const [items, setItems] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Form modal
  const [formVisible, setFormVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<Recording | null>(null);
  const [formData, setFormData] = useState<RecordingFormData>(emptyFormData);
  const [formSaving, setFormSaving] = useState(false);

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

  const openCreateForm = useCallback(() => {
    setEditingItem(null);
    setFormData(emptyFormData);
    setFormVisible(true);
  }, []);

  const openEditForm = useCallback((item: Recording) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      filePath: item.file_path,
      transcribed: item.transcribed,
    });
    setFormVisible(true);
  }, []);

  const closeForm = useCallback(() => {
    setFormVisible(false);
    setEditingItem(null);
    setFormData(emptyFormData);
  }, []);

  const updateFormField = useCallback(
    <K extends keyof RecordingFormData>(field: K, value: RecordingFormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (!formData.title.trim()) {
      Alert.alert("入力エラー", "タイトルを入力してください");
      return;
    }

    setFormSaving(true);
    try {
      if (editingItem) {
        const { data } = await updateRecording(editingItem.id, {
          title: formData.title.trim(),
          file_path: formData.filePath.trim() || undefined,
          transcribed: formData.transcribed,
        });
        if (data) {
          setItems((prev) => prev.map((i) => (i.id === data.id ? data : i)));
          toast.showToast({ message: "更新しました", type: "success" });
        }
      } else {
        const { data } = await createRecording({
          title: formData.title.trim(),
          file_path: formData.filePath.trim() || "",
          duration_seconds: 0,
          transcribed: formData.transcribed,
        });
        if (data) {
          setItems((prev) => [data, ...prev]);
          toast.showToast({ message: "作成しました", type: "success" });
        }
      }
      closeForm();
    } catch {
      toast.showToast({ message: "保存に失敗しました", type: "error" });
    } finally {
      setFormSaving(false);
    }
  }, [editingItem, formData, closeForm, toast]);

  const handleDelete = useCallback(
    (id: string) => {
      const target = items.find((i) => i.id === id);
      if (!target) return;
      Alert.alert("録音データを削除", `「${target.title}」を削除してもよろしいですか？`, [
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
      ]);
    },
    [items, toast],
  );

  const transcribedItems = items.filter((i) => i.transcribed);
  const notTranscribedItems = items.filter((i) => !i.transcribed);

  return {
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
    closeForm,
    handleSave,
    handleDelete,
    onRefresh,
  };
}
