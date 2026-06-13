import { useState, useEffect, useCallback } from "react";
import { Alert } from "react-native";
import { useAuth } from "../../../../src/contexts/AuthContext";
import { useToast } from "../../../../src/contexts/ToastContext";
import {
  getAllAuthData,
  createAuthData,
  updateAuthData,
  deleteAuthData,
} from "../../../../src/services/auth-data";
import type { AuthData } from "../../../../src/types";

export type AuthDTO = AuthData;

export function useAuthData() {
  const { user } = useAuth();
  const toast = useToast();

  const [items, setItems] = useState<AuthData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // フォームモーダル
  const [formVisible, setFormVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<AuthData | null>(null);
  const [formProvider, setFormProvider] = useState("openai");
  const [formLabel, setFormLabel] = useState("");
  const [formApiKey, setFormApiKey] = useState("");
  const [formSaving, setFormSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const { data } = await getAllAuthData();
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

  // ── 作成モーダル表示 ──
  const openCreateForm = useCallback(() => {
    setEditingItem(null);
    setFormProvider("openai");
    setFormLabel("");
    setFormApiKey("");
    setFormVisible(true);
  }, []);

  // ── 編集モーダル表示 ──
  const openEditForm = useCallback((item: AuthData) => {
    setEditingItem(item);
    setFormProvider(item.provider);
    setFormLabel(item.label);
    setFormApiKey("");
    setFormVisible(true);
  }, []);

  // ── 保存（作成／更新） ──
  const handleSave = useCallback(async () => {
    if (!formLabel.trim()) {
      Alert.alert("入力エラー", "ラベルを入力してください");
      return;
    }
    if (!editingItem && !formApiKey.trim()) {
      Alert.alert("入力エラー", "APIキーを入力してください");
      return;
    }

    setFormSaving(true);
    try {
      if (editingItem) {
        const updates: Partial<Pick<AuthData, "provider" | "label" | "api_key">> = {
          provider: formProvider,
          label: formLabel.trim(),
        };
        if (formApiKey.trim()) {
          updates.api_key = formApiKey.trim();
        }
        const { data } = await updateAuthData(editingItem.id, updates);
        if (data) {
          setItems((prev) => prev.map((i) => (i.id === data.id ? data : i)));
          toast.showToast({ message: "更新しました", type: "success" });
        }
      } else {
        const { data } = await createAuthData(
          formProvider,
          formLabel.trim(),
          formApiKey.trim(),
        );
        if (data) {
          setItems((prev) => [data, ...prev]);
          toast.showToast({ message: "作成しました", type: "success" });
        }
      }
      setFormVisible(false);
    } catch {
      toast.showToast({ message: "保存に失敗しました", type: "error" });
    } finally {
      setFormSaving(false);
    }
  }, [editingItem, formProvider, formLabel, formApiKey, toast]);

  // ── 削除 ──
  const handleDelete = useCallback(
    (id: string) => {
      const target = items.find((i) => i.id === id);
      if (!target) return;
      Alert.alert("認証データを削除", `「${target.label}」を削除してもよろしいですか？`, [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除",
          style: "destructive",
          onPress: async () => {
            setItems((prev) => prev.filter((i) => i.id !== id));
            await deleteAuthData(id);
            toast.showToast({ message: "削除しました", type: "success" });
          },
        },
      ]);
    },
    [items, toast],
  );

  // ── 有効/無効 切替 ──
  const handleToggleActive = useCallback(
    async (item: AuthData) => {
      const next = !item.is_active;
      const { data } = await updateAuthData(item.id, { is_active: next });
      if (data) {
        setItems((prev) => prev.map((i) => (i.id === data.id ? data : i)));
      }
    },
    [],
  );

  return {
    items,
    loading,
    refreshing,
    formVisible,
    editingItem,
    formProvider,
    formLabel,
    formApiKey,
    formSaving,
    setFormProvider,
    setFormLabel,
    setFormApiKey,
    setFormVisible,
    openCreateForm,
    openEditForm,
    handleSave,
    handleDelete,
    handleToggleActive,
    onRefresh,
  };
}
