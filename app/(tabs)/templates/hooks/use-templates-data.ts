import { useState, useEffect, useCallback, useRef } from "react";
import { Alert } from "react-native";
import { useAuth } from "../../../../src/contexts/AuthContext";
import { useToast } from "../../../../src/contexts/ToastContext";
import {
  getAllTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "../../../../src/services/templates";
import type { Template } from "../../../../src/types";

// ─── カスタムフック ─────────────────────────────────────────

export function useTemplatesData() {
  const { user } = useAuth();
  const toast = useToast();

  // ── データ状態 ──
  const [templates, setTemplates] = useState<Template[]>([]);

  // ── UI状態 ──
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── モーダル状態 ──
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  // ── 削除取り消し用Ref ──
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deletedTemplateRef = useRef<Template | null>(null);

  // ── データ取得 ──
  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const { data } = await getAllTemplates();
    if (data) setTemplates(data);
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
  const filteredTemplates = search.trim()
    ? templates.filter(
        (t) =>
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          t.content.toLowerCase().includes(search.toLowerCase()),
      )
    : templates;

  // ── モーダルを開く（作成） ──
  const handleOpenCreate = useCallback(() => {
    setEditingTemplate(null);
    setFormModalVisible(true);
  }, []);

  // ── モーダルを開く（編集） ──
  const handleOpenEdit = useCallback((tpl: Template) => {
    setEditingTemplate(tpl);
    setFormModalVisible(true);
  }, []);

  // ── モーダルを閉じる ──
  const handleCloseForm = useCallback(() => {
    setFormModalVisible(false);
    setEditingTemplate(null);
  }, []);

  // ── 保存（新規作成／更新） ──
  const handleSave = useCallback(
    async (name: string, content: string, is_default?: boolean) => {
      if (!name.trim()) return;

      if (editingTemplate) {
        // 更新
        const { data } = await updateTemplate(editingTemplate.id, {
          name: name.trim(),
          content: content.trim(),
          is_default,
        });
        if (data) {
          setTemplates((prev) =>
            prev.map((t) => (t.id === data.id ? data : t)),
          );
          toast.showToast({ message: "テンプレートを更新しました", type: "success" });
        }
      } else {
        // 新規作成
        const { data } = await createTemplate(name.trim(), content.trim(), is_default);
        if (data) {
          setTemplates((prev) => [...prev, data]);
          toast.showToast({ message: "テンプレートを作成しました", type: "success" });
        }
      }

      setFormModalVisible(false);
      setEditingTemplate(null);
    },
    [editingTemplate, toast],
  );

  // ── デフォルト切り替え ──
  const handleToggleDefault = useCallback(
    async (tpl: Template) => {
      const newDefault = !tpl.is_default;
      try {
        // デフォルトに設定する場合、他を全て解除
        if (newDefault) {
          for (const t of templates) {
            if (t.is_default && t.id !== tpl.id) {
              await updateTemplate(t.id, { is_default: false });
            }
          }
        }
        const { data } = await updateTemplate(tpl.id, { is_default: newDefault });
        if (data) {
          setTemplates((prev) =>
            prev.map((t) =>
              t.id === data.id ? data : { ...t, is_default: newDefault ? false : t.is_default },
            ),
          );
          toast.showToast({
            message: newDefault ? "デフォルトに設定しました" : "デフォルトを解除しました",
            type: "success",
          });
        }
      } catch {
        toast.showToast({ message: "更新に失敗しました", type: "error" });
      }
    },
    [templates, toast],
  );

  // ── 削除（取り消し可能） ──
  const handleDelete = useCallback(
    (id: string) => {
      const target = templates.find((t) => t.id === id);
      if (!target) return;

      Alert.alert("テンプレートを削除", `「${target.name}」を削除してもよろしいですか？`, [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除",
          style: "destructive",
          onPress: () => {
            deletedTemplateRef.current = target;
            setTemplates((prev) => prev.filter((t) => t.id !== id));
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
                if (deletedTemplateRef.current) {
                  setTemplates((prev) => [...prev, deletedTemplateRef.current!]);
                  deletedTemplateRef.current = null;
                }
              },
              onAutoHide: async () => {
                if (deletedTemplateRef.current) {
                  await deleteTemplate(deletedTemplateRef.current.id);
                  deletedTemplateRef.current = null;
                }
              },
            });
          },
        },
      ]);
    },
    [toast, templates],
  );

  return {
    // データ
    templates,
    filteredTemplates,
    search,
    loading,
    refreshing,
    formModalVisible,
    editingTemplate,

    // セッター
    setSearch,

    // アクション
    fetchData,
    onRefresh,
    handleOpenCreate,
    handleOpenEdit,
    handleCloseForm,
    handleSave,
    handleDelete,
    handleToggleDefault,
  };
}
