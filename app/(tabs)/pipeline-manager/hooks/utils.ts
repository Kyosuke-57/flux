import type { TranscriptionJob } from "../../../../src/types";

export type PipelineStatus = TranscriptionJob["status"];

export const STATUS_LABELS: Record<PipelineStatus, string> = {
  queued: "待機中",
  processing: "処理中",
  completed: "完了",
  failed: "失敗",
};

export const STATUS_ORDER: PipelineStatus[] = [
  "queued",
  "processing",
  "completed",
  "failed",
];

export function getStatusLabel(status: PipelineStatus): string {
  return STATUS_LABELS[status] ?? status;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function getProgressLabel(
  completed: number,
  total: number,
): string {
  if (total <= 0) return "—";
  return `${completed}/${total}`;
}

export function sortJobs(list: TranscriptionJob[]): TranscriptionJob[] {
  return [...list].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}
