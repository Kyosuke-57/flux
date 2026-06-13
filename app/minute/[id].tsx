import { useState, useEffect, useCallback, useRef } from "react";
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
  BackHandler,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Paths, File } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { getMinute, createMinute, updateMinute, deleteMinute } from "../../src/services/minutes";
import { getAllTemplates } from "../../src/services/templates";
import { getAllTags, createTag } from "../../src/services/tags";
import { getAllFolders } from "../../src/services/folders";
import type { Minute, Template, Tag, Folder } from "../../src/types";
import { Spacing, BorderRadius, theme } from "../../src/theme";
import { useSettings } from "../../src/contexts/SettingsContext";
import { useToast } from "../../src/contexts/ToastContext";
import { useFavorites } from "../../src/contexts/FavoritesContext";
import { Skeleton } from "../../src/components/Skeleton";
import { ActionSheet, type ActionSheetOption } from "../../src/components/ActionSheet";
import { INDUSTRY_TEMPLATES } from "../../src/data/industry-templates";
import { exportAndShareMinute, type ExportFormat } from "../../src/services/export";

export default function MinuteDetailScreen() {
  const { settings } = useSettings();
  const c = theme(settings.isDarkMode);
  const { id, recordingUri, recordingPath } = useLocalSearchParams<{
    id: string;
    recordingUri?: string;
    recordingPath?: string;
  }>();
  const isNew = !id || id === "new" || id === "create";

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [originalTranscript, setOriginalTranscript] = useState("");
  const [correctedTranscript, setCorrectedTranscript] = useState("");
  const [tagsStr, setTagsStr] = useState("");
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [folderModalVisible, setFolderModalVisible] = useState(false);
  const [tagCreateModalVisible, setTagCreateModalVisible] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [transcribing, setTranscribing] = useState(false);
  const [recordingPathState, setRecordingPathState] = useState<string | null>(recordingPath ?? null);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const contentInputRef = useRef<TextInput>(null);
  const [selection, setSelection] = useState<{ start: number; end: number }>({ start: 0, end: 0 });
  const templateContentRef = useRef<string | null>(null);
  const seekBarWidth = useRef(0);
  const player = useAudioPlayer(recordingPathState ?? null, { updateInterval: 250 });
  const playerStatus = useAudioPlayerStatus(player);
  const toast = useToast();
  const { isFavorited, toggle: toggleFavorite } = useFavorites();
  const currentFavorited = id ? isFavorited(id) : false;

  const handleToggleFavorite = useCallback(() => {
    if (id) toggleFavorite(id);
  }, [id, toggleFavorite]);

  const fmt = (s: number) => {
    if (!isFinite(s)) return "--:--";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };
  const initialSnapshot = useRef<{
    title: string;
    content: string;
    correctedTranscript: string;
    tagsStr: string;
    folderId: string | null;
  } | null>(null);

  const hasUnsavedChanges = useCallback(() => {
    if (!initialSnapshot.current) return false;
    return (
      title !== initialSnapshot.current.title ||
      content !== initialSnapshot.current.content ||
      correctedTranscript !== initialSnapshot.current.correctedTranscript ||
      tagsStr !== initialSnapshot.current.tagsStr ||
      selectedFolderId !== initialSnapshot.current.folderId
    );
  }, [title, content, correctedTranscript, tagsStr, selectedFolderId]);

  const confirmBack = useCallback(() => {
    if (hasUnsavedChanges()) {
      Alert.alert(
        "変更を保存していません",
        "保存せずに戻りますか？",
        [
          { text: "キャンセル", style: "cancel" },
          {
            text: "保存せずに戻る",
            style: "destructive",
            onPress: () => router.back(),
          },
        ],
      );
    } else {
      router.back();
    }
  }, [hasUnsavedChanges]);

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
        setOriginalTranscript(minute.original_transcript ?? "");
        setCorrectedTranscript(minute.corrected_transcript ?? "");
        setTagsStr((minute.tags ?? []).join(", "));
        setSelectedFolderId(minute.folder_id ?? null);
        if (minute.recording_path) setRecordingPathState(minute.recording_path);
        initialSnapshot.current = {
          title: minute.title,
          content: minute.content,
          correctedTranscript: minute.corrected_transcript ?? "",
          tagsStr: (minute.tags ?? []).join(", "),
          folderId: minute.folder_id ?? null,
        };
      }
    } else {
      initialSnapshot.current = { title: "", content: "", correctedTranscript: "", tagsStr: "", folderId: null };
    }

    const [tagsResult, templatesResult, foldersResult] = await Promise.all([
      getAllTags(),
      getAllTemplates(),
      getAllFolders(),
    ]);
    if (tagsResult.data) setAvailableTags(tagsResult.data);
    if (templatesResult.data) setTemplates(templatesResult.data);
    if (foldersResult.data) setFolders(foldersResult.data);

    setLoading(false);
  }, [isNew, id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const onBackPress = () => {
      if (hasUnsavedChanges()) {
        Alert.alert(
          "変更を保存していません",
          "保存せずに戻りますか？",
          [
            { text: "キャンセル", style: "cancel" },
            { text: "保存せずに戻る", style: "destructive", onPress: () => router.back() },
          ],
        );
        return true;
      }
      return false;
    };
    const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => subscription.remove();
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (isNew || !id) return;
    const autoSave = setInterval(async () => {
      if (!hasUnsavedChanges()) return;
      const tagsArray = tagsStr.split(",").map((t) => t.trim()).filter(Boolean);
      await updateMinute(id, {
        title: title || generateTitleFromContent(content || correctedTranscript || originalTranscript),
        content,
        tags: tagsArray,
        folder_id: selectedFolderId ?? undefined,
        original_transcript: originalTranscript || undefined,
        corrected_transcript: correctedTranscript || undefined,
      });
      if (initialSnapshot.current) {
        initialSnapshot.current = {
          title: title || initialSnapshot.current.title,
          content,
          correctedTranscript,
          tagsStr,
          folderId: selectedFolderId,
        };
      }
    }, 30000);
    return () => clearInterval(autoSave);
  }, [isNew, id, title, content, tagsStr, selectedFolderId, originalTranscript, correctedTranscript, hasUnsavedChanges]);

  const generateTitleFromContent = useCallback((text: string) => {
    const cleaned = text.replace(/[#*`\[\]\n]/g, " ").trim();
    const match = cleaned.match(/^(.{1,50}?[。\.\?\!]\s)/);
    if (match) return match[1].trim();
    const firstLine = cleaned.split(/\n/)[0]?.trim();
    if (firstLine && firstLine.length <= 60) return firstLine;
    return cleaned.slice(0, 45).trim() + "…";
  }, []);

  const handleTranscribe = useCallback(async () => {
    const uri = recordingPathState || recordingPath || recordingUri;
    if (!uri) return;
    setTranscribing(true);
    try {
      const { pipelineManager } = await import("../../src/services/pipeline-manager");
      await pipelineManager.startPipeline(uri, templateContentRef.current ?? undefined);

      setContent((prev) =>
        prev
          ? prev
          : "# 文字起こし\n\n*文字起こしを開始しました。完了までお待ちください。*\n\n---\n\n"
      );
    } catch (e: unknown) {
      Alert.alert("文字起こしエラー", e instanceof Error ? e.message : "音声の文字起こしに失敗しました。");
      setTranscribing(false);
    }
  }, [recordingUri, recordingPath, recordingPathState]);

  const handleSave = useCallback(async (skipEmptyCheck?: boolean) => {
    const hasContent = content.trim() || correctedTranscript.trim() || originalTranscript.trim();
    if (!skipEmptyCheck && !title.trim() && !hasContent) {
      Alert.alert(
        "空の議事録",
        "タイトルと本文が両方とも空です。このまま保存しますか？",
        [
          { text: "キャンセル", style: "cancel" },
          { text: "保存する", onPress: () => handleSave(true) },
        ],
      );
      return;
    }
    if (!title.trim()) {
      const autoTitle = generateTitleFromContent(
        content || correctedTranscript || originalTranscript
      );
      if (autoTitle) setTitle(autoTitle);
    }
    const finalTitle = title.trim() || generateTitleFromContent(
      content || correctedTranscript || originalTranscript
    );
    if (!finalTitle) {
      Alert.alert("エラー", "タイトルを入力するか、本文を入力してください");
      return;
    }

    setSaving(true);
    const tagsArray = tagsStr
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    let error: Error | null = null;
    if (isNew) {
      const result = await createMinute(
        finalTitle,
        content,
        tagsArray,
        undefined,
        selectedFolderId ?? undefined,
        originalTranscript || undefined,
        correctedTranscript || undefined,
        recordingPathState ?? undefined,
      );
      if (result.data?.id && recordingPathState) {
        setRecordingPathState(recordingPathState);
      }
      error = result.error;
    } else if (id) {
      const result = await updateMinute(id, {
        title: finalTitle,
        content,
        tags: tagsArray,
        folder_id: selectedFolderId ?? undefined,
        original_transcript: originalTranscript || undefined,
        corrected_transcript: correctedTranscript || undefined,
        recording_path: recordingPathState ?? undefined,
      });
      error = result.error;
    }

    setSaving(false);
    if (error) {
      toast.showToast({ message: "議事録の保存に失敗しました", type: "error" });
      return;
    }
    toast.showToast({ message: "保存しました", type: "success" });
    router.back();
  }, [isNew, id, title, content, tagsStr, selectedFolderId, originalTranscript, correctedTranscript, recordingPathState, generateTitleFromContent, toast]);

  const handleDelete = useCallback(() => {
    if (!id || isNew) return;
    setDeleteModalVisible(true);
  }, [id, isNew]);

  const confirmDelete = useCallback(() => {
    if (!id) return;
    setDeleteModalVisible(false);
    router.back();
    toast.showToast({
      message: "削除しました",
      type: "success",
      duration: 4000,
      actionLabel: "取り消し",
      onAction: () => {},
      onAutoHide: async () => {
        const { error } = await deleteMinute(id);
        if (error) {
          toast.showToast({ message: "議事録の削除に失敗しました", type: "error" });
        }
      },
    });
  }, [id, toast]);

  const handleShare = useCallback(
    async (format: "txt" | "md" | "pdf" | "docx") => {
      setShareModalVisible(false);

      if (format === "docx") {
        const isAvailable = await Sharing.isAvailableAsync();
        if (!isAvailable) {
          Alert.alert("共有不可", "このデバイスでは共有が利用できません。");
          return;
        }
        const html = `
          <html>
          <head><meta charset="utf-8"></head>
          <body>
            <h1>${title}</h1>
            ${content.split("\n").map((line) => `<p>${line}</p>`).join("\n")}
          </body>
          </html>
        `;
        const file = new File(Paths.cache, `minute-${Date.now()}.docx`);
        file.write(html);
        await Sharing.shareAsync(file.uri, {
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          dialogTitle: "議事録を共有",
        });
        return;
      }

      // txt / md / pdf は共有サービスに委譲
      try {
        const minute: Minute = {
          id: id ?? "",
          user_id: "",
          title,
          content,
          tags: [],
          created_at: "",
          updated_at: "",
        };
        await exportAndShareMinute(minute, format as ExportFormat);
      } catch (e: unknown) {
        Alert.alert("エクスポートエラー", e instanceof Error ? e.message : "エクスポートに失敗しました。");
      }
    },
    [title, content, id]
  );

  const handleSharePress = useCallback(() => {
    setShareModalVisible(true);
  }, []);

  const doApplyTemplate = useCallback((template: { name: string; content: string }) => {
    templateContentRef.current = template.content;
    setContent(template.content);
    if (!title.trim()) {
      setTitle(`会議 — ${template.name}`);
    }
    setTemplateModalVisible(false);
  }, [title]);

  const handleApplyTemplate = useCallback((template: { name: string; content: string }) => {
    const preview = template.content.replace(/[#*`\[\]]/g, "").trim();
    const snippet = preview.length > 150 ? preview.slice(0, 150) + "…" : preview;
    Alert.alert(
      `テンプレート「${template.name}」を適用`,
      `${snippet}\n\n---\nこのテンプレートを議事録に適用しますか？\n現在の内容は上書きされます。`,
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "適用する",
          onPress: () => doApplyTemplate(template),
        },
      ],
    );
  }, [doApplyTemplate]);

  const handlePreviewTemplate = useCallback((template: { name: string; content: string }) => {
    Alert.alert(
      `テンプレート: ${template.name}`,
      template.content,
    );
  }, []);

  const handleToggleTag = useCallback((tagName: string) => {
    const current = tagsStr
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (current.includes(tagName)) {
      setTagsStr(current.filter((t) => t !== tagName).join(", "));
    } else {
      current.push(tagName);
      setTagsStr(current.join(", "));
    }
  }, [tagsStr]);

  const handleCreateAndAddTag = useCallback(async () => {
    setNewTagName("");
    setTagCreateModalVisible(true);
  }, []);

  const handleConfirmCreateTag = useCallback(async () => {
    if (!newTagName.trim()) return;
    const { data } = await createTag(newTagName.trim());
    if (data) {
      setAvailableTags((prev) => [...prev, data]);
      handleToggleTag(data.name);
    }
    setTagCreateModalVisible(false);
    setNewTagName("");
  }, [newTagName, handleToggleTag]);

  const handleContentChange = (text: string) => {
    setContent(text);
  };

  const parsedTags = tagsStr
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
        <View style={[styles.header, { backgroundColor: c.surface, borderBottomColor: c.divider }]}>
          <Skeleton width={60} height={20} borderRadius={6} />
          <Skeleton width={120} height={20} borderRadius={6} />
          <Skeleton width={50} height={20} borderRadius={6} />
        </View>
        <View style={{ paddingHorizontal: 24, paddingTop: 20, gap: 16 }}>
          <Skeleton width="100%" height={28} borderRadius={8} />
          <Skeleton width="40%" height={18} borderRadius={6} />
          <Skeleton width="100%" height={200} borderRadius={12} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <View style={[styles.header, { backgroundColor: c.surface, borderBottomColor: c.divider }]}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={confirmBack}
        >
          <Ionicons name="chevron-back" size={22} color={c.primary} />
          <Text style={[styles.headerAction, { color: c.primary }]}>戻る</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.textPrimary }]}>
          {isNew ? "新規議事録" : "議事録を編集"}
        </Text>
        <TouchableOpacity onPress={() => handleSave()} disabled={saving}>
          <Text style={[styles.headerAction, styles.saveBtn, { color: c.primary }, saving && styles.disabled]}>
            {saving ? "保存中…" : "保存"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <TextInput
          style={[styles.titleInput, { color: c.textPrimary, borderBottomColor: c.divider }]}
          value={title}
          onChangeText={setTitle}
          placeholder="会議のタイトル"
          placeholderTextColor={c.textMuted}
        />

        <TouchableOpacity
          style={[styles.folderSelector, { borderBottomColor: c.divider }]}
          onPress={() => setFolderModalVisible(true)}
        >
          <Ionicons
            name={selectedFolderId ? "folder" : "folder-open-outline"}
            size={18}
            color={selectedFolderId ? c.primary : c.textMuted}
          />
          <Text style={[styles.folderSelectorText, { color: selectedFolderId ? c.textPrimary : c.textMuted }]}>
            {selectedFolderId
              ? folders.find((f) => f.id === selectedFolderId)?.name ?? "フォルダ"
              : "フォルダを選択"}
          </Text>
          <Ionicons name="chevron-down" size={16} color={c.textMuted} />
        </TouchableOpacity>

        <View style={styles.tagsSection}>
          <View style={styles.tagInputRow}>
            <TextInput
              style={[styles.tagInput, { color: c.primary, borderBottomColor: c.divider }]}
              value={tagsStr}
              onChangeText={setTagsStr}
              placeholder="タグ（カンマ区切り）"
              placeholderTextColor={c.textMuted}
            />
            <TouchableOpacity
              style={[styles.addTagBtn, { backgroundColor: c.primaryBg }]}
              onPress={handleCreateAndAddTag}
            >
              <Ionicons name="add" size={18} color={c.primary} />
            </TouchableOpacity>
          </View>
          {availableTags.length > 0 && (
            <View style={styles.tagSuggestions}>
              {availableTags.map((tag) => {
                const isSelected = parsedTags.includes(tag.name);
                return (
                  <TouchableOpacity
                    key={tag.id}
                    style={[
                      styles.tagChip,
                      { backgroundColor: c.surfaceSecondary },
                      isSelected && { backgroundColor: c.primary },
                    ]}
                    onPress={() => handleToggleTag(tag.name)}
                  >
                    <Text
                      style={[
                        styles.tagChipText,
                        { color: c.textSecondary },
                        isSelected && { color: c.textInverse, fontWeight: "600" },
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

        {recordingPathState && (
          <View style={[styles.playerCard, { backgroundColor: c.surface, borderColor: c.cardBorder }]}>
            {/* コントロール行 */}
            <View style={styles.playerControls}>
              <View style={styles.playerButtons}>
                <TouchableOpacity
                  style={[styles.playerBtn, { backgroundColor: c.primary }]}
                  onPress={() => {
                    if (player.playing) player.pause();
                    else player.play();
                  }}
                >
                  <Ionicons
                    name={player.playing ? "pause" : "play"}
                    size={20}
                    color="#fff"
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.playerBtnSmall, { backgroundColor: c.surfaceSecondary }]}
                  onPress={() => {
                    player.seekTo(0);
                    player.pause();
                  }}
                >
                  <Ionicons name="stop" size={16} color={c.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.playerTime, { color: c.textMuted }]}>
                {fmt(playerStatus.currentTime)} / {fmt(playerStatus.duration)}
              </Text>
            </View>

            {/* シークバー */}
            <View
              style={[styles.seekTrack, { backgroundColor: c.border }]}
              onStartShouldSetResponder={() => true}
              onResponderRelease={(e) => {
                if (!playerStatus.duration || !seekBarWidth.current) return;
                const ratio = Math.max(0, Math.min(1, e.nativeEvent.locationX / seekBarWidth.current));
                player.seekTo(ratio * playerStatus.duration);
              }}
              onLayout={(e) => {
                seekBarWidth.current = e.nativeEvent.layout.width;
              }}
            >
              <View
                style={[
                  styles.seekFill,
                  {
                    backgroundColor: c.primary,
                    width: playerStatus.duration > 0
                      ? `${(playerStatus.currentTime / playerStatus.duration) * 100}%`
                      : "0%",
                  },
                ]}
              />
            </View>

            {/* 文字起こし */}
            {transcribing ? (
              <View style={styles.transcribingRow}>
                <ActivityIndicator size="small" color={c.primary} />
                <Text style={[styles.transcribingText, { color: c.textMuted }]}>文字起こし中…</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.transcribeBtn, { backgroundColor: c.primaryBg }]}
                onPress={handleTranscribe}
              >
                <Ionicons name="mic-outline" size={16} color={c.primary} />
                <Text style={[styles.transcribeBtnText, { color: c.primary }]}>文字起こし</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <TextInput
          ref={contentInputRef}
          style={[styles.contentInput, { color: c.textPrimary }]}
          value={content}
          onChangeText={handleContentChange}
          onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
          placeholder={"議事録を書き始めましょう…"}
          placeholderTextColor={c.textMuted}
          multiline
          textAlignVertical="top"
        />
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: c.surface, borderTopColor: c.divider }]}>
        {!isNew && (
          <TouchableOpacity
            style={[styles.deleteBtn, { backgroundColor: c.errorBg }]}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={16} color={c.error} />
            <Text style={[styles.deleteBtnText, { color: c.error }]}>削除</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.favBtn,
            {
              backgroundColor: currentFavorited ? c.primaryBg : c.surfaceSecondary,
            },
          ]}
          onPress={handleToggleFavorite}
        >
          <Ionicons
            name={currentFavorited ? "heart" : "heart-outline"}
            size={16}
            color={currentFavorited ? c.primary : c.textMuted}
          />
          <Text
            style={[
              styles.favBtnText,
              {
                color: currentFavorited ? c.primary : c.textSecondary,
              },
            ]}
          >
            {currentFavorited ? "保存済み" : "保存"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.templateBtn, { backgroundColor: c.primaryBg }]}
          onPress={() => setTemplateModalVisible(true)}
        >
          <Ionicons name="document-text-outline" size={14} color={c.primary} />
          <Text style={[styles.templateBtnText, { color: c.primary }]}>テンプレート</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.shareBtn, { backgroundColor: c.primary }]}
          onPress={handleSharePress}
        >
          <Ionicons name="share-outline" size={16} color="#fff" />
          <Text style={[styles.shareBtnText, { color: "#fff" }]}>共有</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={templateModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTemplateModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: c.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: c.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: c.divider }]}>
              <Text style={[styles.modalTitle, { color: c.textPrimary }]}>テンプレートを適用</Text>
              <TouchableOpacity onPress={() => setTemplateModalVisible(false)}>
                <Text style={[styles.modalClose, { color: c.primary }]}>閉じる</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              contentContainerStyle={styles.templateList}
              ListHeaderComponent={
                templates.length > 0 ? (
                  <Text style={[styles.templateSectionLabel, { color: c.textMuted }]}>マイテンプレート</Text>
                ) : null
              }
              data={[
                ...templates.map((t) => ({ type: "user" as const, data: t })),
                ...INDUSTRY_TEMPLATES.map((p) => ({ type: "industry" as const, data: p })),
              ]}
              keyExtractor={(item) =>
                item.type === "user" ? item.data.id : `preset_${item.data.id}`
              }
              renderItem={({ item, index }) => {
                const isFirstIndustry =
                  item.type === "industry" &&
                  (index === templates.length || (templates.length === 0 && index === 0));
                return (
                  <>
                    {isFirstIndustry && (
                      <Text style={[styles.templateSectionLabel, { color: c.textMuted, marginTop: 16 }]}>
                        業種別テンプレート
                      </Text>
                    )}
                    <TouchableOpacity
                      style={[styles.templateCard, { backgroundColor: c.background, borderColor: c.cardBorder }]}
                      onPress={() => {
                        if (item.type === "user") {
                          handleApplyTemplate(item.data as Template);
                        } else {
                          handleApplyTemplate(item.data as typeof INDUSTRY_TEMPLATES[number]);
                        }
                      }}
                      onLongPress={() => {
                        if (item.type === "user") {
                          handlePreviewTemplate(item.data as Template);
                        } else {
                          handlePreviewTemplate(item.data as typeof INDUSTRY_TEMPLATES[number]);
                        }
                      }}
                    >
                      <View style={styles.templateCardHeader}>
                        {item.type === "industry" && (
                          <View style={[styles.templateCategoryBadge, { backgroundColor: c.primaryBg }]}>
                            <Text style={[styles.templateCategoryText, { color: c.primary }]}>
                              {(item.data as typeof INDUSTRY_TEMPLATES[number]).category}
                            </Text>
                          </View>
                        )}
                        <Text style={[styles.templateCardName, { color: c.textPrimary }]}>{item.data.name}</Text>
                        {item.type === "user" && (item.data as Template).is_default && (
                          <View style={[styles.defaultBadge, { backgroundColor: c.primaryBg }]}>
                            <Text style={[styles.defaultBadgeText, { color: c.primary }]}>デフォルト</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.templateCardPreview, { color: c.textSecondary }]} numberOfLines={3}>
                        {item.data.content.replace(/[#*`\[\]]/g, "").trim() || "（空）"}
                      </Text>
                    </TouchableOpacity>
                  </>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={folderModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFolderModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: c.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: c.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: c.divider }]}>
              <Text style={[styles.modalTitle, { color: c.textPrimary }]}>フォルダを選択</Text>
              <TouchableOpacity onPress={() => setFolderModalVisible(false)}>
                <Text style={[styles.modalClose, { color: c.primary }]}>閉じる</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              contentContainerStyle={styles.folderList}
              data={folders}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: c.textMuted }]}>
                  フォルダがありません
                </Text>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.folderItem,
                    { backgroundColor: c.background, borderColor: c.cardBorder },
                    selectedFolderId === item.id && { borderColor: c.primary, borderWidth: 2 },
                  ]}
                  onPress={() => {
                    setSelectedFolderId(selectedFolderId === item.id ? null : item.id);
                    setFolderModalVisible(false);
                  }}
                >
                  <Ionicons
                    name="folder"
                    size={22}
                    color={item.color ?? c.primary}
                  />
                  <Text style={[styles.folderItemName, { color: c.textPrimary }]}>{item.name}</Text>
                  {selectedFolderId === item.id && (
                    <Ionicons name="checkmark-circle" size={20} color={c.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={tagCreateModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTagCreateModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: c.overlay }]}>
          <View style={[styles.tagCreateModal, { backgroundColor: c.surface }]}>
            <Text style={[styles.tagCreateTitle, { color: c.textPrimary }]}>新しいタグを作成</Text>
            <TextInput
              style={[styles.tagCreateInput, { color: c.textPrimary, borderColor: c.border, backgroundColor: c.background }]}
              value={newTagName}
              onChangeText={setNewTagName}
              placeholder="タグ名"
              placeholderTextColor={c.textMuted}
              autoFocus
            />
            <View style={styles.tagCreateActions}>
              <TouchableOpacity
                style={[styles.tagCreateCancel, { backgroundColor: c.surfaceSecondary }]}
                onPress={() => setTagCreateModalVisible(false)}
              >
                <Text style={[styles.tagCreateCancelText, { color: c.textSecondary }]}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tagCreateConfirm, { backgroundColor: c.primary }]}
                onPress={handleConfirmCreateTag}
              >
                <Text style={[styles.tagCreateConfirmText, { color: c.textInverse }]}>作成</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ActionSheet
        visible={shareModalVisible}
        title="共有形式を選択"
        options={[
          { label: "テキスト (.txt)", onPress: () => handleShare("txt") },
          { label: "Markdown (.md)", onPress: () => handleShare("md") },
          { label: "PDF (.pdf)", onPress: () => handleShare("pdf") },
          { label: "Word (.docx)", onPress: () => handleShare("docx") },
        ]}
        onClose={() => setShareModalVisible(false)}
      />

      <ActionSheet
        visible={deleteModalVisible}
        title="議事録を削除"
        options={[
          { label: "削除する", onPress: confirmDelete, destructive: true },
        ]}
        onClose={() => setDeleteModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  loadingText: { marginTop: 12, fontSize: 15 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerAction: { fontSize: 16, fontWeight: "500" },
  headerTitle: { fontSize: 17, fontWeight: "600" },
  saveBtn: { fontWeight: "700" },
  disabled: { opacity: 0.5 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 24 },

  titleInput: {
    fontSize: 24,
    fontWeight: "700",
    paddingVertical: 16,
    borderBottomWidth: 1,
    marginBottom: 4,
  },

  folderSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  folderSelectorText: {
    flex: 1,
    fontSize: 14,
  },

  tagsSection: { marginBottom: 12, marginTop: 4 },
  tagInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tagInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  addTagBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
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
  },
  tagChipText: { fontSize: 12 },

  playerCard: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  playerControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  playerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  playerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  playerBtnSmall: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },
  playerTime: {
    fontSize: 13,
    fontWeight: "500",
    fontVariant: ["tabular-nums"],
  },
  seekTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  seekFill: {
    height: "100%",
    borderRadius: 3,
  },
  transcribingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  transcribingText: { fontSize: 14, fontStyle: "italic" },
  transcribeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  transcribeBtnText: { fontSize: 13, fontWeight: "600" },

  contentInput: {
    flex: 1,
    fontSize: 15,
    lineHeight: 24,
    paddingVertical: 12,
    minHeight: 300,
  },

  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  deleteBtnText: { fontSize: 13, fontWeight: "600" },
  favBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  favBtnText: { fontSize: 13, fontWeight: "500" },
  templateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  templateBtnText: { fontSize: 13, fontWeight: "600" },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  shareBtnText: { fontSize: 14, fontWeight: "700" },

  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
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
  },
  modalTitle: { fontSize: 17, fontWeight: "600" },
  modalClose: { fontSize: 16, fontWeight: "500" },
  modalEmpty: {
    paddingVertical: 32,
    alignItems: "center",
  },
  modalEmptyText: { fontSize: 14 },
  templateSectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  templateList: { paddingHorizontal: 24, paddingTop: 12 },
  templateCard: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  templateCardHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  templateCardName: { fontSize: 15, fontWeight: "600" },
  templateCategoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  templateCategoryText: { fontSize: 11, fontWeight: "500" },
  defaultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  defaultBadgeText: { fontSize: 11, fontWeight: "500" },
  templateCardPreview: {
    fontSize: 13,
    lineHeight: 18,
  },

  folderList: { paddingHorizontal: 24, paddingTop: 12, gap: 8 },
  folderItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  folderItemName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 32,
  },

  tagCreateModal: {
    marginHorizontal: 40,
    borderRadius: 16,
    padding: 24,
    gap: 16,
  },
  tagCreateTitle: {
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
  },
  tagCreateInput: {
    fontSize: 15,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  tagCreateActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  tagCreateCancel: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tagCreateCancelText: {
    fontSize: 14,
    fontWeight: "500",
  },
  tagCreateConfirm: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tagCreateConfirmText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
