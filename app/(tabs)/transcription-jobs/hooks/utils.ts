/**
 * 純粋なユーティリティ関数
 * React / React Native に依存しないためテストしやすい
 */

import type { TranscriptionJob } from "../../../../src/types";

export type SortField = "date" | "name" | "status";
export type SortDirection = "asc" | "desc";

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    queued: "待機中",
    processing: "処理中",
    completed: "完了",
    failed: "失敗",
  };
  return map[status] ?? status;
}

/**
 * ソート関数: SortField / SortDirection に基づいて配列をソートする
 */
export function sortJobs(
  jobs: TranscriptionJob[],
  field: SortField,
  direction: SortDirection,
): TranscriptionJob[] {
  const sorted = [...jobs].sort((a, b) => {
    let cmp: number;
    switch (field) {
      case "date":
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      case "name":
        cmp = a.file_name.localeCompare(b.file_name, "ja");
        break;
      case "status": {
        const order = ["queued", "processing", "completed", "failed"];
        cmp = order.indexOf(a.status) - order.indexOf(b.status);
        break;
      }
    }
    return direction === "asc" ? cmp : -cmp;
  });
  return sorted;
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    queued: "#F59E0B",
    processing: "#3B82F6",
    completed: "#22C55E",
    failed: "#EF4444",
  };
  return map[status] ?? "#94A3B8";
}
