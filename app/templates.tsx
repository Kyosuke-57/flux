import { useState, useEffect, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  ActivityIndicator, Alert, Modal, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../src/contexts/AuthContext";
import { useSettings } from "../src/contexts/SettingsContext";
import { useToast } from "../src/contexts/ToastContext";
import {
  getAllTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "../src/services/templates";
import type { Template } from "../src/types";
import { theme, Shadows } from "../src/theme";
import { GlassCard } from "../src/components/Glass";

export default function TemplatesScreen() {
  const { settings } = useSettings();
  const c = theme(settings.isDarkMode);
  const { user } = useAuth();
  const toast = useToast();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [formName, setFormName] = useState("");
  const [formContent, setFormContent] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchTemplates = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await getAllTemplates();
      if (data) setTemplates(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const openCreateModal = () => {
    setEditingTemplate(null);
    setFormName("");
    setFormContent("");
    setModalVisible(true);
  };

  const openEditModal = (tpl: Template) => {
    setEditingTemplate(tpl);
    setFormName(tpl.name);
    setFormContent(tpl.content);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.showToast({ message: "テンプレート名を入力してください", type: "error" });
      return;
    }
    if (!formContent.trim()) {
      toast.showToast({ message: "テンプレート内容を入力してください", type: "error" });
      return;
    }
    setSaving(true);
    try {
      if (editingTemplate) {
        const { error } = await updateTemplate(editingTemplate.id, {
          name: formName.trim(),
          content: formContent.trim(),
        });
        if (error) throw error;
        setTemplates((prev) =>
          prev.map((t) =>
            t.id === editingTemplate.id
              ? { ...t, name: formName.trim(), content: formContent.trim() }
              : t
          )
        );
        toast.showToast({ message: "テンプレートを更新しました", type: "success" });
      } else {
        const { data, error } = await createTemplate(formName.trim(), formContent.trim());
        if (error) throw error;
        if (data) setTemplates((prev) => [data, ...prev]);
        toast.showToast({ message: "テンプレートを作成しました", type: "success" });
      }
      setModalVisible(false);
    } catch (e: any) {
      toast.showToast({
        message: e.message ?? "保存に失敗しました",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (tpl: Template) => {
    Alert.alert("テンプレートを削除", `「${tpl.name}」を削除してもよろしいですか？`, [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: async () => {
          try {
            const { error } = await deleteTemplate(tpl.id);
            if (error) throw error;
            setTemplates((prev) => prev.filter((t) => t.id !== tpl.id));
            toast.showToast({ message: "削除しました", type: "success" });
          } catch (e: any) {
            toast.showToast({
              message: e.message ?? "削除に失敗しました",
              type: "error",
            });
          }
        },
      },
    ]);
  };

  const handleToggleDefault = async (tpl: Template) => {
    const newDefault = !tpl.is_default;
    try {
      // If setting as default, unset all others first
      if (newDefault) {
        for (const t of templates) {
          if (t.is_default && t.id !== tpl.id) {
            await updateTemplate(t.id, { is_default: false });
          }
        }
      }
      const { error } = await updateTemplate(tpl.id, { is_default: newDefault });
      if (error) throw error;
      setTemplates((prev) =>
        prev.map((t) => ({
          ...t,
          is_default: t.id === tpl.id ? newDefault : newDefault ? false : t.is_default,
        }))
      );
      toast.showToast({
        message: newDefault ? "デフォルトに設定しました" : "デフォルトを解除しました",
        type: "success",
      });
    } catch (e: any) {
      toast.showToast({
        message: e.message ?? "更新に失敗しました",
        type: "error",
      });
    }
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={c.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: c.textPrimary }]}>テンプレート管理</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={c.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.textPrimary }]}>テンプレート管理</Text>
        <TouchableOpacity onPress={openCreateModal} style={styles.addBtn}>
          <Ionicons name="add" size={24} color={c.primary} />
        </TouchableOpacity>
      </View>

      {/* Empty state */}
      {templates.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="document-text-outline" size={64} color={c.textMuted} />
          <Text style={[styles.emptyTitle, { color: c.textPrimary }]}>テンプレートがありません</Text>
          <Text style={[styles.emptySubtext, { color: c.textSecondary }]}>
            テンプレートを作成すると、新しい議事録の雛形として利用できます。
          </Text>
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: c.primary }]}
            onPress={openCreateModal}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.createButtonText}>テンプレートを作成</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={templates}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <GlassCard intensity={25} style={styles.card}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => openEditModal(item)}
                style={styles.cardBody}
              >
                <View style={styles.cardTop}>
                  <View style={styles.cardTitleRow}>
                    <Text style={[styles.cardTitle, { color: c.textPrimary }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.is_default && (
                      <View style={[styles.defaultBadge, { backgroundColor: c.primaryBg }]}>
                        <Text style={[styles.defaultBadgeText, { color: c.primary }]}>デフォルト</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={[styles.iconBtn, { backgroundColor: c.surfaceSecondary }]}
                      onPress={() => handleToggleDefault(item)}
                    >
                      <Ionicons
                        name={item.is_default ? "bookmark" : "bookmark-outline"}
                        size={16}
                        color={item.is_default ? c.primary : c.textMuted}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.iconBtn, { backgroundColor: c.errorBg }]}
                      onPress={() => handleDelete(item)}
                    >
                      <Ionicons name="trash-outline" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={[styles.cardContent, { color: c.textSecondary }]} numberOfLines={3}>
                  {item.content}
                </Text>
                <Text style={[styles.cardDate, { color: c.textMuted }]}>
                  更新日: {new Date(item.updated_at).toLocaleDateString("ja-JP")}
                </Text>
              </TouchableOpacity>
            </GlassCard>
          )}
        />
      )}

      {/* Create / Edit Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: c.overlay }]}
          activeOpacity={1}
          onPress={() => {
            if (!saving) setModalVisible(false);
          }}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={[styles.modalContent, { backgroundColor: c.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: c.divider }]}>
              <Text style={[styles.modalTitle, { color: c.textPrimary }]}>
                {editingTemplate ? "テンプレートを編集" : "新しいテンプレート"}
              </Text>
              <TouchableOpacity
                onPress={() => { if (!saving) setModalVisible(false); }}
                disabled={saving}
              >
                <Text style={[styles.modalClose, { color: c.primary }]}>閉じる</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>テンプレート名</Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.textPrimary }]}
                value={formName}
                onChangeText={setFormName}
                placeholder="例: 週次ミーティング"
                placeholderTextColor={c.textMuted}
                editable={!saving}
              />

              <Text style={[styles.fieldLabel, { color: c.textSecondary, marginTop: 16 }]}>テンプレート内容（Markdown）</Text>
              <TextInput
                style={[
                  styles.textArea,
                  { backgroundColor: c.background, borderColor: c.border, color: c.textPrimary },
                ]}
                value={formContent}
                onChangeText={setFormContent}
                placeholder="# タイトル\n\n## 参加者\n\n## 議題\n\n## メモ"
                placeholderTextColor={c.textMuted}
                multiline
                textAlignVertical="top"
                editable={!saving}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalCancel, { backgroundColor: c.surfaceSecondary }]}
                  onPress={() => { if (!saving) setModalVisible(false); }}
                  disabled={saving}
                >
                  <Text style={[styles.modalCancelText, { color: c.textSecondary }]}>キャンセル</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalSave, { backgroundColor: c.primary, opacity: saving ? 0.6 : 1 }]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalSaveText}>
                      {editingTemplate ? "更新" : "作成"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },

  // Empty state
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },

  // List
  list: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },

  // Card
  card: {
    marginTop: 12,
    padding: 16,
    borderRadius: 14,
    ...Shadows.md,
  },
  cardBody: {
    gap: 8,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    flexShrink: 1,
  },
  defaultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  cardActions: {
    flexDirection: "row",
    gap: 6,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  cardContent: {
    fontSize: 13,
    lineHeight: 19,
  },
  cardDate: {
    fontSize: 11,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontWeight: "600" },
  modalClose: { fontSize: 16, fontWeight: "500" },
  modalBody: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    fontSize: 15,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  textArea: {
    fontSize: 15,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 180,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 20,
    marginBottom: 16,
  },
  modalCancel: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalCancelText: { fontSize: 14, fontWeight: "500" },
  modalSave: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 60,
    alignItems: "center",
  },
  modalSaveText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
