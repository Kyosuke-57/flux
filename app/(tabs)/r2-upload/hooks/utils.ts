import type { TranscriptionJob } from "../../../../src/types";

export type UploadStatus = TranscriptionJob["status"];

export const STATUS_LABELS: Record<UploadStatus, string> = {
  queued: "待機中",
  processing: "処理中",
  completed: "完了",
  failed: "失敗",
};

export function getStatusLabel(status: UploadStatus): string {
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

export type SortField = "date" | "name" | "status";
export type SortOrder = "asc" | "desc";

/** ステータスの優先順位（ソート用） */
const STATUS_ORDER: Record<string, number> = {
  queued: 0,
  processing: 1,
  completed: 2,
  failed: 3,
};

/**
 * 指定されたフィールドと順序でジョブリストをソートする。
 * ソート元の配列は変更せず、新しい配列を返す。
 */
export function sortJobsBy(
  list: TranscriptionJob[],
  field: SortField,
  order: SortOrder,
): TranscriptionJob[] {
  return [...list].sort((a, b) => {
    let cmp: number;
    switch (field) {
      case "date":
        cmp =
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      case "name":
        cmp = a.file_name.localeCompare(b.file_name);
        break;
      case "status": {
        const sa = STATUS_ORDER[a.status] ?? 99;
        const sb = STATUS_ORDER[b.status] ?? 99;
        cmp = sa - sb;
        break;
      }
      default:
        cmp = 0;
    }
    return order === "desc" ? -cmp : cmp;
  });
}

/** 従来の sortJobs は互換性のために維持（日付降順） */
export function sortJobs(list: TranscriptionJob[]): TranscriptionJob[] {
  return sortJobsBy(list, "date", "desc");
}
