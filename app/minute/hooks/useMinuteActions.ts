import { useState, useCallback, useRef, useEffect } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { deleteMinute } from "../../../src/services/minutes";
import { exportAndShareMinute, type ExportFormat } from "../../../src/services/export";
import type { Minute } from "../../../src/types";
import { useToast } from "../../../src/contexts/ToastContext";
import { useFavorites } from "../../../src/contexts/FavoritesContext";
import { usePipeline } from "../../../src/hooks/usePipeline";

/**
 * 議事録のアクション（文字起こし・共有・削除・テンプレート・お気に入り）を管理するカスタムフック。
 *
 * 責務:
 * - 文字起こし開始 (handleTranscribe)
 * - 共有 (handleShare, handleSharePress)
 * - 削除 (handleDelete, confirmDelete)
 * - テンプレート適用 (handleApplyTemplate, handlePreviewTemplate)
 * - お気に入り (handleToggleFavorite)
 */
export function useMinuteActions(
  id: string | undefined,
  isNew: boolean,
  recordingUri?: string,
  recordingPath?: string,
) {
  // ─── 内部状態 ──────────────────────────────────────────────
  const [transcribing, setTranscribing] = useState(false);
  const [recordingPathState, setRecordingPathState] = useState<string | null>(recordingPath ?? null);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [folderModalVisible, setFolderModalVisible] = useState(false);

  const templateContentRef = useRef<string | null>(null);

  // ─── コンテキスト / サービス ──────────────────────────────
  const toast = useToast();
  const { status, startPipeline } = usePipeline();
  const { isFavorited, toggle: toggleFavorite } = useFavorites();
  const currentFavorited = id ? isFavorited(id) : false;

  // ─── 文字起こしステータス監視 ────────────────────────────
  useEffect(() => {
    if (status === "completed" || status === "failed") {
      setTranscribing(false);
    }
  }, [status]);

  // ─── handleToggleFavorite ─────────────────────────────────
  const handleToggleFavorite = useCallback(() => {
    if (id) toggleFavorite(id);
  }, [id, toggleFavorite]);

  // ─── handleTranscribe ──────────────────────────────────────
  const handleTranscribe = useCallback(
    async (onSetContent: (fn: (prev: string) => string) => void) => {
      const uri = recordingPathState || recordingPath || recordingUri;
      if (!uri) return;
      setTranscribing(true);
      try {
        await startPipeline(uri, templateContentRef.current ?? undefined, "manual");
        onSetContent((prev: string) =>
          prev
            ? prev
            : "# 文字起こし\n\n*文字起こしを開始しました。完了までお待ちください。*\n\n---\n\n",
        );
      } catch (e: unknown) {
        Alert.alert("文字起こしエラー", e instanceof Error ? e.message : "音声の文字起こしに失敗しました。");
        setTranscribing(false);
      }
    },
    [recordingUri, recordingPath, recordingPathState, startPipeline],
  );

  // 文字起こし完了/失敗の検知用エフェクトは親で管理 (status 監視)

  // ─── handleShare ──────────────────────────────────────────
  const handleShare = useCallback(
    async (
      format: "txt" | "md" | "pdf" | "docx",
      titleVal: string,
      contentVal: string,
    ) => {
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
            <h1>${titleVal}</h1>
            ${contentVal.split("\n").map((line) => `<p>${line}</p>`).join("\n")}
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
          title: titleVal,
          content: contentVal,
          tags: [],
          created_at: "",
          updated_at: "",
        };
        await exportAndShareMinute(minute, format as ExportFormat);
      } catch (e: unknown) {
        Alert.alert("エクスポートエラー", e instanceof Error ? e.message : "エクスポートに失敗しました。");
      }
    },
    [id],
  );

  // ─── handleSharePress ─────────────────────────────────────
  const handleSharePress = useCallback(() => {
    setShareModalVisible(true);
  }, []);

  // ─── handleDelete / confirmDelete ─────────────────────────
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

  // ─── テンプレート関連 ──────────────────────────────────────
  const doApplyTemplate = useCallback(
    (template: { name: string; content: string }, onSetContent: (v: string) => void, onSetTitle: (v: string) => void, titleVal: string) => {
      templateContentRef.current = template.content;
      onSetContent(template.content);
      if (!titleVal.trim()) {
        onSetTitle(`会議 — ${template.name}`);
      }
      setTemplateModalVisible(false);
    },
    [],
  );

  const handleApplyTemplate = useCallback(
    (
      template: { name: string; content: string },
      onSetContent: (v: string) => void,
      onSetTitle: (v: string) => void,
      titleVal: string,
    ) => {
      const preview = template.content.replace(/[#*`\[\]]/g, "").trim();
      const snippet = preview.length > 150 ? preview.slice(0, 150) + "…" : preview;
      Alert.alert(
        `テンプレート「${template.name}」を適用`,
        `${snippet}\n\n---\nこのテンプレートを議事録に適用しますか？\n現在の内容は上書きされます。`,
        [
          { text: "キャンセル", style: "cancel" },
          {
            text: "適用する",
            onPress: () => doApplyTemplate(template, onSetContent, onSetTitle, titleVal),
          },
        ],
      );
    },
    [doApplyTemplate],
  );

  const handlePreviewTemplate = useCallback((template: { name: string; content: string }) => {
    Alert.alert(
      `テンプレート: ${template.name}`,
      template.content,
    );
  }, []);

  // ─── 文字起こしステータス監視 ────────────────────────────
  // status が completed / failed になったら transcribing を false に
  const checkTranscribeStatus = useCallback((statusVal: string | null) => {
    if (statusVal === "completed" || statusVal === "failed") {
      setTranscribing(false);
    }
  }, []);

  return {
    // 状態
    transcribing,
    recordingPathState,
    setRecordingPathState,
    shareModalVisible,
    setShareModalVisible,
    deleteModalVisible,
    setDeleteModalVisible,
    templateModalVisible,
    setTemplateModalVisible,
    folderModalVisible,
    setFolderModalVisible,
    templateContentRef,
    currentFavorited,

    // アクション
    handleToggleFavorite,
    handleTranscribe,
    handleShare,
    handleSharePress,
    handleDelete,
    confirmDelete,
    handleApplyTemplate,
    handlePreviewTemplate,
    checkTranscribeStatus,
  };
}
