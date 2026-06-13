import { useState, useEffect, useCallback } from "react";
import { Alert } from "react-native";
import { useAuth } from "../../../../src/contexts/AuthContext";
import { useToast } from "../../../../src/contexts/ToastContext";
import {
  getAllTranscriptionJobs,
  deleteTranscriptionJob,
  retryTranscriptionJob,
} from "../../../../src/services/transcription-jobs";
import type { TranscriptionJob } from "../../../../src/types";

export function usePipelineData() {
  const { user } = useAuth();
  const toast = useToast();

  const [items, setItems] = useState<TranscriptionJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const { data } = await getAllTranscriptionJobs();
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

  // ── 削除 ──
  const handleDelete = useCallback(
    (id: string) => {
      const target = items.find((i) => i.id === id);
      if (!target) return;
      Alert.alert(
        "パイプラインジョブを削除",
        `「${target.file_name}」を削除してもよろしいですか？`,
        [
          { text: "キャンセル", style: "cancel" },
          {
            text: "削除",
            style: "destructive",
            onPress: async () => {
              setItems((prev) => prev.filter((i) => i.id !== id));
              await deleteTranscriptionJob(id);
              toast.showToast({ message: "削除しました", type: "success" });
            },
          },
        ],
      );
    },
    [items, toast],
  );

  // ── リトライ ──
  const handleRetry = useCallback(
    async (id: string) => {
      const { data } = await retryTranscriptionJob(id);
      if (data) {
        setItems((prev) => prev.map((i) => (i.id === data.id ? data : i)));
        toast.showToast({ message: "再実行を依頼しました", type: "success" });
      } else {
        toast.showToast({ message: "再実行に失敗しました", type: "error" });
      }
    },
    [toast],
  );

  return {
    items,
    loading,
    refreshing,
    handleDelete,
    handleRetry,
    onRefresh,
  };
}
