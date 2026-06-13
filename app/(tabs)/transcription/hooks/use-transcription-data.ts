import { useState, useEffect, useCallback, useRef } from "react";
import { Alert } from "react-native";
import { useAuth } from "../../../../src/contexts/AuthContext";
import { useToast } from "../../../../src/contexts/ToastContext";
import {
  getAllTranscriptionJobs,
  createTranscriptionJob,
  updateTranscriptionJob,
  deleteTranscriptionJob,
  retryTranscriptionJob,
} from "../../../../src/services/transcription-jobs";
import { getAllRecordings } from "../../../../src/services/recordings";
import type { TranscriptionJob, Recording } from "../../../../src/types";

// ─── 型定義 ────────────────────────────────────────────────

export type StatusFilter = "all" | "queued" | "processing" | "completed" | "failed";

// ─── カスタムフック ─────────────────────────────────────────

export function useTranscriptionData() {
  const { user } = useAuth();
  const toast = useToast();

  // ── データ状態 ──
  const [jobs, setJobs] = useState<TranscriptionJob[]>([]);
  const [recordings, setRecordings] = useState<Recording[]>([]);

  // ── UI状態 ──
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── モーダル状態 ──
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingJob, setEditingJob] = useState<TranscriptionJob | null>(null);

  // ── Ref ──
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deletedJobRef = useRef<TranscriptionJob | null>(null);

  // ── データ取得 ──
  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const [{ data: jobsData }, { data: recordingsData }] = await Promise.all([
      getAllTranscriptionJobs(),
      getAllRecordings(),
    ]);
    if (jobsData) setJobs(jobsData);
    if (recordingsData) setRecordings(recordingsData);
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

  // ── 作成 ──
  const handleCreate = useCallback(
    async (input: {
      recording_id: string;
      r2_key: string;
      file_name: string;
      file_size: number;
    }) => {
      const { data, error } = await createTranscriptionJob({
        ...input,
        status: "queued",
      });
      if (error) {
        toast.showToast({ message: "文字起こしジョブの作成に失敗しました", type: "error" });
        return;
      }
      if (data) {
        setJobs((prev) => [data, ...prev]);
        setCreateModalVisible(false);
        toast.showToast({ message: "文字起こしジョブを作成しました", type: "success" });
      }
    },
    [toast],
  );

  // ── 編集 ──
  const handleEdit = useCallback(
    async (
      id: string,
      updates: Partial<Pick<TranscriptionJob, "file_name" | "file_size" | "r2_key" | "recording_id" | "status" | "error_message">>,
    ) => {
      const { data, error } = await updateTranscriptionJob(id, updates);
      if (error) {
        toast.showToast({ message: "文字起こしジョブの更新に失敗しました", type: "error" });
        return;
      }
      if (data) {
        setJobs((prev) => prev.map((j) => (j.id === id ? data : j)));
        setEditModalVisible(false);
        setEditingJob(null);
        toast.showToast({ message: "更新しました", type: "success" });
      }
    },
    [toast],
  );

  // ── 削除（取り消し可能） ──
  const handleDelete = useCallback(
    (id: string) => {
      Alert.alert("文字起こしジョブを削除", "このジョブを削除してもよろしいですか？", [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除",
          style: "destructive",
          onPress: () => {
            const target = jobs.find((j) => j.id === id);
            if (!target) return;
            deletedJobRef.current = target;
            setJobs((prev) => prev.filter((j) => j.id !== id));
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
                if (deletedJobRef.current) {
                  setJobs((prev) => [deletedJobRef.current!, ...prev]);
                  deletedJobRef.current = null;
                }
              },
              onAutoHide: async () => {
                if (deletedJobRef.current) {
                  await deleteTranscriptionJob(deletedJobRef.current.id);
                  deletedJobRef.current = null;
                }
              },
            });
          },
        },
      ]);
    },
    [toast, jobs],
  );

  // ── リトライ ──
  const handleRetry = useCallback(
    async (id: string) => {
      const { data, error } = await retryTranscriptionJob(id);
      if (error) {
        toast.showToast({ message: "リトライに失敗しました", type: "error" });
        return;
      }
      if (data) {
        setJobs((prev) => prev.map((j) => (j.id === id ? data : j)));
        toast.showToast({ message: "リトライを実行しました", type: "success" });
      }
    },
    [toast],
  );

  // ── 編集モーダルを開く ──
  const openEditModal = useCallback((job: TranscriptionJob) => {
    setEditingJob(job);
    setEditModalVisible(true);
  }, []);

  // ── フィルタリング ──
  const filteredJobs =
    statusFilter === "all"
      ? jobs
      : jobs.filter((j) => j.status === statusFilter);

  // ── 戻り値 ──
  return {
    // データ
    jobs: filteredJobs,
    recordings,
    statusFilter,
    loading,
    refreshing,

    // モーダル
    createModalVisible,
    editModalVisible,
    editingJob,

    // セッター
    setStatusFilter,
    setCreateModalVisible,
    setEditModalVisible,
    setEditingJob,

    // アクション
    handleCreate,
    handleEdit,
    handleDelete,
    handleRetry,
    openEditModal,
    fetchData,
    onRefresh,
  };
}
