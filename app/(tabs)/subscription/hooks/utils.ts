// ─── サブスクリプション画面 ユーティリティ関数 ─────────────────

import type { PlanInfo } from "../../../../src/services/subscription";

// ─── ソート関連の型 ──────────────────────────────────────────

/** ソート可能なフィールド */
export type SortField = "name" | "monthlyMinutes" | "status";

/** ソート順 */
export type SortOrder = "asc" | "desc";

// ─── ソート用ラベル（UI表示用） ──────────────────────────────

export const SORT_LABELS: Record<SortField, string> = {
  name: "名前",
  monthlyMinutes: "利用時間",
  status: "ステータス",
};

// ─── ソート関数 ──────────────────────────────────────────────

/** プラン一覧を指定されたフィールドと順序でソートする */
export function sortPlans(
  plans: PlanInfo[],
  field: SortField,
  order: SortOrder,
): PlanInfo[] {
  const tierOrder: Record<string, number> = { free: 0, pro: 1, byok: 2 };

  return [...plans].sort((a, b) => {
    let cmp = 0;
    switch (field) {
      case "name":
        cmp = a.name.localeCompare(b.name);
        break;
      case "monthlyMinutes":
        cmp = a.monthlyMinutes - b.monthlyMinutes;
        break;
      case "status":
        cmp = (tierOrder[a.id] ?? 99) - (tierOrder[b.id] ?? 99);
        break;
    }
    return order === "asc" ? cmp : -cmp;
  });
}

/**
 * プラン一覧を検索クエリでフィルタリングする。
 * name / price / features のいずれかに部分一致するプランを返す。
 * クエリが空の場合は全件返す。
 */
export function filterPlans(plans: PlanInfo[], query: string): PlanInfo[] {
  if (!query.trim()) return plans;
  const q = query.trim().toLowerCase();
  return plans.filter(
    (plan) =>
      plan.name.toLowerCase().includes(q) ||
      plan.price.toLowerCase().includes(q) ||
      plan.features.some((f) => f.toLowerCase().includes(q)),
  );
}

/**
 * ISO日付文字列を日本語ロケールの日付形式に変換する
 * 例: "2026-06-13T12:00:00Z" → "2026年6月13日"
 */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * 秒数を人間が読みやすい形式（"Xh Ym"）に変換する
 * 例: secondsToHms(9000) → "2h 30m"
 */
export function secondsToHms(s: number): string {
  if (s <= 0) return "0m";
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * プランIDに応じた表示色を返す（ダークモード対応）
 * - free: グレー系
 * - pro:  バイオレット系
 * - byok: アンバー系
 */
export function getPlanColor(planId: string, isDark: boolean): string {
  switch (planId) {
    case "pro":
      return isDark ? "#A78BFA" : "#7C3AED";
    case "byok":
      return isDark ? "#FBBF24" : "#D97706";
    case "free":
    default:
      return isDark ? "#9CA3AF" : "#6B7280";
  }
}

/**
 * プランIDに応じた Ionicons アイコン名を返す
 * - free: cafe-outline（コーヒー／無料感）
 * - pro:  star（プレミアム）
 * - byok: key-outline（BYOK = 自前キー）
 */
export function getPlanIcon(planId: string): string {
  switch (planId) {
    case "pro":
      return "star";
    case "byok":
      return "key-outline";
    case "free":
    default:
      return "cafe-outline";
  }
}
