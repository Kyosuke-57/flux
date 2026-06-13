/**
 * subscription-screen のテスト
 * - フレームワークの動作確認
 * - ユーティリティの単体テスト
 */

import { describe, it, expect } from "vitest";
import {
  secondsToHms,
  getPlanColor,
  getPlanIcon,
  filterPlans,
  sortPlans,
} from "../hooks/utils";
import type { PlanInfo } from "../../../../src/services/subscription";

// ─── フレームワーク動作確認 ───────────────────────────────

describe("vitest フレームワーク", () => {
  it("基本的なアサーションが動作する", () => {
    expect(1 + 1).toBe(2);
    expect({ a: 1 }).toEqual({ a: 1 });
    expect("hello").toContain("ell");
  });
});

// ─── secondsToHms ──────────────────────────────────────────

describe("secondsToHms", () => {
  it("0秒は0mを返す", () => {
    expect(secondsToHms(0)).toBe("0m");
  });

  it("負の値は0mを返す", () => {
    expect(secondsToHms(-100)).toBe("0m");
  });

  it("60秒は1mを返す", () => {
    expect(secondsToHms(60)).toBe("1m");
  });

  it("3600秒は1h 0mを返す", () => {
    expect(secondsToHms(3600)).toBe("1h 0m");
  });

  it("3660秒は1h 1mを返す", () => {
    expect(secondsToHms(3660)).toBe("1h 1m");
  });

  it("9000秒は2h 30mを返す", () => {
    expect(secondsToHms(9000)).toBe("2h 30m");
  });
});

// ─── getPlanColor ──────────────────────────────────────────

describe("getPlanColor", () => {
  it("proはライトモードで#7C3AEDを返す", () => {
    expect(getPlanColor("pro", false)).toBe("#7C3AED");
  });

  it("proはダークモードで#A78BFAを返す", () => {
    expect(getPlanColor("pro", true)).toBe("#A78BFA");
  });

  it("byokはライトモードで#D97706を返す", () => {
    expect(getPlanColor("byok", false)).toBe("#D97706");
  });

  it("byokはダークモードで#FBBF24を返す", () => {
    expect(getPlanColor("byok", true)).toBe("#FBBF24");
  });

  it("freeはライトモードでグレー系を返す", () => {
    expect(getPlanColor("free", false)).toBe("#6B7280");
  });

  it("freeはダークモードでグレー系を返す", () => {
    expect(getPlanColor("free", true)).toBe("#9CA3AF");
  });

  it("不明なプランIDはfreeと同じ色を返す", () => {
    expect(getPlanColor("unknown" as any, false)).toBe("#6B7280");
  });
});

// ─── getPlanIcon ───────────────────────────────────────────

describe("getPlanIcon", () => {
  it("proはstarを返す", () => {
    expect(getPlanIcon("pro")).toBe("star");
  });

  it("byokはkey-outlineを返す", () => {
    expect(getPlanIcon("byok")).toBe("key-outline");
  });

  it("freeはcafe-outlineを返す", () => {
    expect(getPlanIcon("free")).toBe("cafe-outline");
  });

  it("不明なプランIDはcafe-outlineを返す", () => {
    expect(getPlanIcon("unknown" as any)).toBe("cafe-outline");
  });
});

// ─── filterPlans ───────────────────────────────────────────

const mockPlans: PlanInfo[] = [
  {
    id: "free",
    name: "Free",
    price: "無料",
    monthlyMinutes: 30,
    features: ["月30分までの録音", "基本的な文字起こし", "10件までの議事録保存"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "¥500/月",
    monthlyMinutes: 120,
    features: ["月120分までの録音", "高品質文字起こし", "無制限の議事録保存"],
    highlighted: true,
  },
  {
    id: "byok",
    name: "Max",
    price: "¥1,500/月",
    monthlyMinutes: 600,
    features: ["月10時間までの録音", "最優先・高精度文字起こし", "チーム共有機能"],
  },
];

describe("filterPlans", () => {
  it("空クエリは全件返す", () => {
    expect(filterPlans(mockPlans, "")).toHaveLength(3);
    expect(filterPlans(mockPlans, "   ")).toHaveLength(3);
  });

  it("プラン名でフィルタする（部分一致・大文字小文字区別なし）", () => {
    const result = filterPlans(mockPlans, "pro");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("pro");
  });

  it("日本語プラン名でフィルタする", () => {
    const result = filterPlans(mockPlans, "max");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("byok");
  });

  it("価格「無料」でフィルタする", () => {
    const result = filterPlans(mockPlans, "無料");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("free");
  });

  it("価格「1,500」でフィルタする", () => {
    const result = filterPlans(mockPlans, "1,500");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("byok");
  });

  it("機能説明でフィルタする", () => {
    const result = filterPlans(mockPlans, "文字起こし");
    expect(result).toHaveLength(3);
  });

  it("特定のプランのみヒットする機能でフィルタする", () => {
    const result = filterPlans(mockPlans, "チーム共有");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("byok");
  });

  it("該当なしの場合は空配列を返す", () => {
    const result = filterPlans(mockPlans, "zzzzzzz");
    expect(result).toHaveLength(0);
  });
});

// ─── sortPlans ──────────────────────────────────────────────

describe("sortPlans", () => {
  it("名前の昇順でソートする", () => {
    const result = sortPlans(mockPlans, "name", "asc");
    expect(result.map((p) => p.id)).toEqual(["free", "byok", "pro"]);
  });

  it("名前の降順でソートする", () => {
    const result = sortPlans(mockPlans, "name", "desc");
    expect(result.map((p) => p.id)).toEqual(["pro", "byok", "free"]);
  });

  it("月間利用時間の昇順でソートする", () => {
    const result = sortPlans(mockPlans, "monthlyMinutes", "asc");
    expect(result.map((p) => p.id)).toEqual(["free", "pro", "byok"]);
  });

  it("月間利用時間の降順でソートする", () => {
    const result = sortPlans(mockPlans, "monthlyMinutes", "desc");
    expect(result.map((p) => p.id)).toEqual(["byok", "pro", "free"]);
  });

  it("ステータス（free < pro < byok）の昇順でソートする", () => {
    const result = sortPlans(mockPlans, "status", "asc");
    expect(result.map((p) => p.id)).toEqual(["free", "pro", "byok"]);
  });

  it("ステータスの降順でソートする", () => {
    const result = sortPlans(mockPlans, "status", "desc");
    expect(result.map((p) => p.id)).toEqual(["byok", "pro", "free"]);
  });

  it("ソートは元の配列を変更しない", () => {
    sortPlans(mockPlans, "name", "desc");
    expect(mockPlans.map((p) => p.id)).toEqual(["free", "pro", "byok"]);
  });
});
