/**
 * 純粋なユーティリティ関数
 * React / React Native に依存しないためテストしやすい
 */

import type { Recording } from "../../../../src/types";

/**
 * ISO日時文字列を日本語形式でフォーマット
 */
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

// ─── ソート ──────────────────────────────────────────────────

export type SortField = "date" | "name" | "status";
export type SortDirection = "asc" | "desc";

export type SortConfig = {
  field: SortField;
  direction: SortDirection;
};

/**
 * ソート設定に従って録音データを並び替える
 * - date: created_at の昇順/降順
 * - name: title の辞書順昇順/降順
 * - status: transcribed を先頭に（降順時は false が先）
 */
export function sortRecordings(
  items: Recording[],
  sort: SortConfig,
): Recording[] {
  const sorted = [...items];
  const dir = sort.direction === "asc" ? 1 : -1;

  sorted.sort((a, b) => {
    switch (sort.field) {
      case "date":
        return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      case "name":
        return dir * a.title.localeCompare(b.title);
      case "status":
        // transcribed: true → 1, false → 0
        // asc: false (0) が先に来る (0 - 1 = -1)
        // desc: true (1) が先に来る (1 - 0 = 1)
        return dir * (Number(a.transcribed) - Number(b.transcribed));
      default:
        return 0;
    }
  });

  return sorted;
}
