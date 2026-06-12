/**
 * 純粋なユーティリティ関数
 * React / React Native に依存しないためテストしやすい
 */

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getPreview(content: string): string {
  const stripped = content.replace(/[#*`\[\]]/g, "").trim();
  return stripped.length > 100
    ? stripped.slice(0, 100) + "…"
    : stripped;
}
