/**
 * 純粋なユーティリティ関数
 * React / React Native に依存しないためテストしやすい
 */

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ja-JP", {
    timeZone: "Asia/Tokyo",
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

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    queued: "#F59E0B",
    processing: "#3B82F6",
    completed: "#22C55E",
    failed: "#EF4444",
  };
  return map[status] ?? "#94A3B8";
}
