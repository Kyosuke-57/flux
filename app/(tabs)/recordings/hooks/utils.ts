/**
 * Recordings screen utility functions
 */
import type { Recording } from "../../../../src/types";

export type SortKey = "date" | "name" | "status";
export type SortOrder = "asc" | "desc";

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getDurationLabel(seconds: number): string {
  if (!seconds || seconds <= 0) return "0秒";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}秒`;
}

export function getTranscribedLabel(transcribed: boolean): string {
  return transcribed ? "完了" : "未";
}

/**
 * 録音時間（秒）を "mm:ss" 形式に変換
 */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * ファイルサイズ（bytes）を人間可読形式に変換
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * 録音データを検索クエリでフィルタリング
 * - query が空文字の場合は全件返却
 * - title と file_path に対して大文字小文字を区別せず部分一致
 */
export function filterRecordings(items: Recording[], query: string): Recording[] {
  const q = query.trim();
  if (!q) return items;
  const lower = q.toLowerCase();
  return items.filter(
    (item) =>
      item.title.toLowerCase().includes(lower) ||
      item.file_path.toLowerCase().includes(lower),
  );
}

export function sortRecordings(
  items: Recording[],
  key: SortKey,
  order: SortOrder,
): Recording[] {
  const sorted = [...items];
  sorted.sort((a, b) => {
    let cmp: number;
    switch (key) {
      case "date":
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      case "name":
        cmp = a.title.localeCompare(b.title, "ja");
        break;
      case "status":
        cmp = Number(a.transcribed) - Number(b.transcribed);
        break;
    }
    return order === "asc" ? cmp : -cmp;
  });
  return sorted;
}
