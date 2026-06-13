import type { Recording } from "../../../../src/types";

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

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m === 0) return `${s}秒`;
  return `${m}分${s}秒`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export type SortField = "date" | "name" | "status";
export type SortDirection = "asc" | "desc";

const sortFieldMapping: Record<SortField, (r: Recording) => string | number | boolean> = {
  date: (r) => new Date(r.created_at).getTime(),
  name: (r) => r.title.toLowerCase(),
  status: (r) => (r.transcribed ? 1 : 0),
};

export function sortRecordings(
  list: Recording[],
  field: SortField = "date",
  direction: SortDirection = "desc",
): Recording[] {
  const getValue = sortFieldMapping[field];
  return [...list].sort((a, b) => {
    const va = getValue(a);
    const vb = getValue(b);
    if (va < vb) return direction === "asc" ? -1 : 1;
    if (va > vb) return direction === "asc" ? 1 : -1;
    return 0;
  });
}
