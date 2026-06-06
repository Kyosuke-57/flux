import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Paths } from "expo-file-system";
import { File } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { getMinute, createMinute, updateMinute, deleteMinute } from "../../src/services/minutes";
import { getAllTemplates } from "../../src/services/templates";
import { getAllTags } from "../../src/services/tags";
import type { Minute, Template, Tag } from "../../src/types";
import { Colors } from "../../src/theme";

export default function MinuteDetailScreen() {
  const { id, recordingUri } = useLocalSearchParams<{
    id: string;
    recordingUri?: string;
  }>();
  const isNew = !id || id === "new" || id === "create";

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagsStr, setTagsStr] = useState("");
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [hasRecording] = useState(!!recordingUri);

  // Fetch existing minute + tags + templates on mount
  const fetchData = useCallback(async () => {
    if (!isNew && id) {
      const { data: minute, error } = await getMinute(id);
      if (error) {
        Alert.alert("エラー", "議事録の詳細の読み込みに失敗しました");
        router.back();
        return;
      }
      if (minute) {
        setTitle(minute.title);
        setContent(minute.content);
        setTagsStr((minute.tags ?? []).join(", "));
      }
    }

    // Load tags and templates for suggestions
    const [tagsResult, templatesResult] = await Promise.all([
      getAllTags(),
      getAllTemplates(),
    ]);
    if (tagsResult.data) setAvailableTags(tagsResult.data);
    if (templatesResult.data) setTemplates(templatesResult.data);

    setLoading(false);
  }, [isNew, id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Start transcription for new minutes with a recording
  const handleTranscribe = useCallback(async () => {
    if (!recordingUri) return;
    setTranscribing(true);
    try {
      // Use the recording pipeline: upload → transcribe
      const { uploadToR2 } = await import("../../src/services/r2-upload");
      const { startTranscription } = await import("../../src/services/transcription");
      const FS = await import("expo-file-system");

      const fileName = `recording_${Date.now()}.m4a`;
      const mimeType = "audio/mp4";
      const info = await FS.default.getInfoAsync(recordingUri);
      const fileSize = "size" in info ? (info.size ?? 0) : 0;

      // 1. Upload to R2
      const { r2Key } = await uploadToR2({
        uri: recordingUri,
        filename: fileName,
        mimeType,
        fileSize,
      });

      // 2. Start transcription
      const recordingId = crypto.randomUUID?.() ?? `${Date.now()}`;
      await startTranscription({
        r2Key,
        recordingId,
        fileSize,
        fileName,
      });

      setContent((prev) =>
        prev
          ? prev
          : "# 文字起こし\n\n*文字起こしを開始しました。完了までお待ちください。*\n\n---\n\n"
      );
    } catch (e: any) {
      Alert.alert("文字起こしエラー", e?.message ?? "音声の文字起こしに失敗しました。");
    } finally {
      setTranscribing(false);
    }
  }, [recordingUri]);

  // Save — create or update
  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert("エラー", "タイトルは必須です");
      return;
    }
    setSaving(true);
    const tagsArray = tagsStr
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    let error: any = null;
    if (isNew) {
      const result = await createMinute(title.trim(), content, tagsArray);
      error = result.error;
    } else if (id) {
      const result = await updateMinute(id, {
        title: title.trim(),
        content,
        tags: tagsArray,
      });
      error = result.error;
    }

    setSaving(false);
    if (error) {
      Alert.alert("エラー", "議事録の保存に失敗しました");
      return;
    }
    router.back();
  }, [isNew, id, title, content, tagsStr]);

  // Delete existing minute with confirmation
  const handleDelete = useCallback(() => {
    if (!id || isNew) return;
    Alert.alert(
      "議事録を削除",
      "この議事録を削除してもよろしいですか？この操作は元に戻せません。",
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除",
          style: "destructive",
          onPress: async () => {
            const { error } = await deleteMinute(id);
            if (error) {
              Alert.alert("エラー", "議事録の削除に失敗しました");
              return;
            }
            router.back();
          },
        },
      ]
    );
  }, [id, isNew]);

  // Export as TXT or MD using expo-sharing
  const handleExport = useCallback(
    async (format: "txt" | "md") => {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert("エクスポート不可", "このデバイスでは共有が利用できません。");
        return;
      }

      const ext = format === "md" ? "md" : "txt";
      const data =
        format === "md"
          ? `# ${title}\n\n${content}`
          : `${title}\n\n${content}`;

      const fileUri = `${Paths.cache}minute-${Date.now()}.${ext}`;
      await new File(fileUri).write(data);

      await Sharing.shareAsync(fileUri, {
        mimeType: format === "md" ? "text/markdown" : "text/plain",
        dialogTitle: "議事録をエクスポート",
        UTI: format === "md" ? "net.daringfireball.markdown" : "public.plain-text",
      });
    },
    [title, content]
  );

  // Apply a template — sets the content and optionally the title
  const handleApplyTemplate = useCallback((template: Template) => {
    setContent(template.content);
    if (!title.trim()) {
      // Derive a default title from the template name
      setTitle(`会議 — ${template.name}`);
    }
    setTemplateModalVisible(false);
  }, [title]);

  // Add a tag chip to the tags string
  const handleAddTag = useCallback((tagName: string) => {
    const current = tagsStr
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (!current.includes(tagName)) {
      current.push(tagName);
      setTagsStr(current.join(", "));
    }
  }, [tagsStr]);

  const parsedTags = tagsStr
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>議事録を読み込み中…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.headerAction}>戻る</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isNew ? "新規議事録" : "議事録を編集"}
        </Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          <Text style={[styles.headerAction, styles.saveBtn, saving && styles.disabled]}>
            {saving ? "保存中…" : "保存"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <TextInput
          style={styles.titleInput}
          value={title}
          onChangeText={setTitle}
          placeholder="会議のタイトル"
          placeholderTextColor="#94a3b8"
        />

        {/* Tags */}
        <View style={styles.tagsSection}>
          <TextInput
            style={styles.tagInput}
            value={tagsStr}
            onChangeText={setTagsStr}
            placeholder="タグ（カンマ区切り）"
            placeholderTextColor="#94a3b8"
          />
          {availableTags.length > 0 && (
            <View style={styles.tagSuggestions}>
              {availableTags.map((tag) => {
                const isSelected = parsedTags.includes(tag.name);
                return (
                  <TouchableOpacity
                    key={tag.id}
                    style={[
                      styles.tagChip,
                      isSelected && styles.tagChipSelected,
                    ]}
                    onPress={() => handleAddTag(tag.name)}
                  >
                    <Text
                      style={[
                        styles.tagChipText,
                        isSelected && styles.tagChipTextSelected,
                      ]}
                    >
                      {tag.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Transcribe button — only for new minutes with a recording */}
        {isNew && hasRecording && (
          <View style={styles.transcribeSection}>
            {transcribing ? (
              <View style={styles.transcribingRow}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.transcribingText}>文字起こし中…</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.transcribeBtn} onPress={handleTranscribe}>
                <Text style={styles.transcribeBtnText}>🎙 録音を文字起こし</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Content */}
        <TextInput
          style={styles.contentInput}
          value={content}
          onChangeText={setContent}
          placeholder="議事録を書き始めましょう…"
          placeholderTextColor="#94a3b8"
          multiline
          textAlignVertical="top"
        />
      </ScrollView>

      {/* Bottom action bar */}
      <View style={styles.bottomBar}>
        {/* Delete — only for existing minutes */}
        {!isNew && (
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Text style={styles.deleteBtnText}>削除</Text>
          </TouchableOpacity>
        )}

        <View style={styles.exportRow}>
          <Text style={styles.exportLabel}>エクスポート:</Text>
          <TouchableOpacity
            style={styles.exportBtn}
            onPress={() => handleExport("txt")}
          >
            <Text style={styles.exportBtnText}>.txt</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.exportBtn}
            onPress={() => handleExport("md")}
          >
            <Text style={styles.exportBtnText}>.md</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.templateBtn}
          onPress={() => setTemplateModalVisible(true)}
        >
          <Text style={styles.templateBtnText}>テンプレート</Text>
        </TouchableOpacity>
      </View>

      {/* Template picker modal */}
      <Modal
        visible={templateModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTemplateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>テンプレートを適用</Text>
              <TouchableOpacity onPress={() => setTemplateModalVisible(false)}>
                <Text style={styles.modalClose}>閉じる</Text>
              </TouchableOpacity>
            </View>

            {templates.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Text style={styles.modalEmptyText}>
                  テンプレートがありません。設定で作成してください。
                </Text>
              </View>
            ) : (
              <FlatList
                data={templates}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.templateList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.templateCard}
                    onPress={() => handleApplyTemplate(item)}
                  >
                    <View style={styles.templateCardHeader}>
                      <Text style={styles.templateCardName}>{item.name}</Text>
                      {item.is_default && (
                        <View style={styles.defaultBadge}>
                          <Text style={styles.defaultBadgeText}>デフォルト</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.templateCardPreview} numberOfLines={3}>
                      {item.content.replace(/[#*`\\[\\]]/g, "").trim() || "空のテンプレート"}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA" },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  loadingText: { marginTop: 12, color: "#64748b", fontSize: 15 },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  headerAction: { fontSize: 16, color: Colors.primary, fontWeight: "500" },
  headerTitle: { fontSize: 17, fontWeight: "600", color: "#0f172a" },
  saveBtn: { fontWeight: "700" },
  disabled: { opacity: 0.5 },

  // Scroll area
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 24 },

  // Title
  titleInput: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    marginBottom: 12,
  },

  // Tags
  tagsSection: { marginBottom: 12 },
  tagInput: {
    fontSize: 14,
    color: Colors.primary,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  tagSuggestions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: "#f1f5f9",
  },
  tagChipSelected: { backgroundColor: Colors.primary },
  tagChipText: { fontSize: 12, color: "#64748b" },
  tagChipTextSelected: { color: "#fff", fontWeight: "600" },

  // Transcribe
  transcribeSection: { marginBottom: 12 },
  transcribingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
  },
  transcribingText: { fontSize: 14, color: "#64748b", fontStyle: "italic" },
  transcribeBtn: {
    backgroundColor: "#eef2ff",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  transcribeBtnText: { fontSize: 14, color: Colors.primary, fontWeight: "600" },

  // Content
  contentInput: {
    flex: 1,
    fontSize: 15,
    color: "#0f172a",
    lineHeight: 24,
    paddingVertical: 12,
    minHeight: 300,
  },

  // Bottom bar
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    backgroundColor: "#fff",
    gap: 8,
  },
  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#fef2f2",
  },
  deleteBtnText: { fontSize: 13, color: "#ef4444", fontWeight: "600" },
  exportRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  exportLabel: { fontSize: 13, color: "#64748b", fontWeight: "600" },
  exportBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },
  exportBtnText: { fontSize: 13, color: "#0f172a", fontWeight: "500" },
  templateBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#eef2ff",
  },
  templateBtnText: { fontSize: 13, color: Colors.primary, fontWeight: "600" },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  modalTitle: { fontSize: 17, fontWeight: "600", color: "#0f172a" },
  modalClose: { fontSize: 16, color: Colors.primary, fontWeight: "500" },
  modalEmpty: {
    paddingVertical: 32,
    alignItems: "center",
  },
  modalEmptyText: { fontSize: 14, color: "#64748b" },
  templateList: { paddingHorizontal: 24, paddingTop: 12 },
  templateCard: {
    backgroundColor: "#fafafa",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  templateCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  templateCardName: { fontSize: 15, fontWeight: "600", color: "#0f172a" },
  defaultBadge: {
    backgroundColor: "#eef2ff",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  defaultBadgeText: { fontSize: 11, color: Colors.primary, fontWeight: "500" },
  templateCardPreview: {
    fontSize: 13,
    color: "#64748b",
    lineHeight: 18,
  },
});
