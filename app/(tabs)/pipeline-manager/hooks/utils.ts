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

/** ソートの対象フィールド */
export type SortField = "date" | "name" | "status";

/** ソートの向き */
export type SortDirection = "asc" | "desc";

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

/**
 * 設定可能なソート関数。
 * @param list ソート対象のリスト
 * @param field ソートフィールド（date / name / status）
 * @param direction 昇順（asc）／降順（desc）
 */
export function sortJobs(
  list: TranscriptionJob[],
  field: SortField = "date",
  direction: SortDirection = "desc",
): TranscriptionJob[] {
  return [...list].sort((a, b) => {
    let cmp: number;
    switch (field) {
      case "date":
        cmp =
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime();
        break;
      case "name":
        cmp = a.file_name.localeCompare(b.file_name, "ja");
        break;
      case "status":
        cmp =
          STATUS_ORDER.indexOf(a.status) -
          STATUS_ORDER.indexOf(b.status);
        break;
    }
    return direction === "asc" ? cmp : -cmp;
  });
}
