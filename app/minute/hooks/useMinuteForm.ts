import { useState, useEffect, useCallback, useRef } from "react";
import { Alert, BackHandler, TextInput } from "react-native";
import { router } from "expo-router";
import { getMinute, createMinute, updateMinute } from "../../../src/services/minutes";
import { getAllTemplates } from "../../../src/services/templates";
import { getAllTags, createTag } from "../../../src/services/tags";
import { getAllFolders } from "../../../src/services/folders";
import type { Tag, Template, Folder } from "../../../src/types";
import { useToast } from "../../../src/contexts/ToastContext";

/**
 * 議事録フォームの状態と操作を管理するカスタムフック。
 *
 * 責務:
 * - フォームフィールド (title, content, tags, folder) の状態管理
 * - 初期データロード (getMinute, getAllTags, getAllTemplates, getAllFolders)
 * - 自動保存 (30秒間隔)
 * - handleContentChange, handleSave, タグCRUD
 * - 未保存変更検知 (hasUnsavedChanges, confirmBack)
 */
export function useMinuteForm(
  id: string | undefined,
  isNew: boolean,
  recordingUri?: string,
  recordingPath?: string,
) {
  // ─── フォーム状態 ──────────────────────────────────────────
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
  const [selection, setSelection] = useState<{ start: number; end: number }>({ start: 0, end: 0 });
  const [newTagName, setNewTagName] = useState("");
  const [tagCreateModalVisible, setTagCreateModalVisible] = useState(false);
  const [recordingPathState, setRecordingPathState] = useState<string | null>(recordingPath ?? null);

  const contentInputRef = useRef<TextInput>(null);
  const toast = useToast();

  // ─── 初期スナップショット（未保存変更検知用）──────────────
  const initialSnapshot = useRef<{
    title: string;
    content: string;
    correctedTranscript: string;
    tagsStr: string;
    folderId: string | null;
  } | null>(null);

  // ─── パース済みタグ ────────────────────────────────────────
  const parsedTags = tagsStr
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  // ─── generateTitleFromContent ──────────────────────────────
  const generateTitleFromContent = useCallback((text: string) => {
    const cleaned = text.replace(/[#*`\[\]\n]/g, " ").trim();
    const match = cleaned.match(/^(.{1,50}?[。\.\?\!]\s)/);
    if (match) return match[1].trim();
    const firstLine = cleaned.split(/\n/)[0]?.trim();
    if (firstLine && firstLine.length <= 60) return firstLine;
    return cleaned.slice(0, 45).trim() + "…";
  }, []);

  // ─── 未保存変更検知 ────────────────────────────────────────
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

  // ─── 戻る確認 ──────────────────────────────────────────────
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

  // ─── 初期データロード ──────────────────────────────────────
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

  // ─── BackHandler 登録 ─────────────────────────────────────
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

  // ─── 自動保存 (30秒間隔) ─────────────────────────────────
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
  }, [isNew, id, title, content, tagsStr, selectedFolderId, originalTranscript, correctedTranscript, hasUnsavedChanges, generateTitleFromContent]);

  // ─── handleContentChange ──────────────────────────────────
  const handleContentChange = useCallback((text: string) => {
    setContent(text);
  }, []);

  // ─── handleSave ───────────────────────────────────────────
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
        content || correctedTranscript || originalTranscript,
      );
      if (autoTitle) setTitle(autoTitle);
    }
    const finalTitle = title.trim() || generateTitleFromContent(
      content || correctedTranscript || originalTranscript,
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

  // ─── handleToggleTag ──────────────────────────────────────
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

  // ─── handleCreateAndAddTag ────────────────────────────────
  const handleCreateAndAddTag = useCallback(() => {
    setNewTagName("");
    setTagCreateModalVisible(true);
  }, []);

  // ─── handleConfirmCreateTag ────────────────────────────────
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

  return {
    // フォーム状態
    title,
    setTitle,
    content,
    setContent,
    originalTranscript,
    correctedTranscript,
    setCorrectedTranscript,
    tagsStr,
    setTagsStr,
    selectedFolderId,
    setSelectedFolderId,
    availableTags,
    templates,
    folders,
    loading,
    saving,
    selection,
    setSelection,
    newTagName,
    setNewTagName,
    tagCreateModalVisible,
    setTagCreateModalVisible,
    recordingPathState,
    setRecordingPathState,
    contentInputRef,
    parsedTags,
    initialSnapshot,

    // コールバック
    handleContentChange,
    handleSave,
    handleToggleTag,
    handleCreateAndAddTag,
    handleConfirmCreateTag,
    confirmBack,
    hasUnsavedChanges,
    generateTitleFromContent,
  };
}

