import { describe, it, expect, vi } from "vitest";

// subscription.ts は supabase.ts → @supabase/supabase-js に依存しているためモック
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: new Error("Not found") }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: new Error("RPC not found") }),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    })),
  })),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

vi.mock("react-native-url-polyfill/auto", () => ({}));

import { PLANS } from "../services/subscription";
import { PLAN_LIMITS, type SubscriptionPlan } from "../types";

describe("PLANS", () => {
  it("3つのプラン（free, pro, byok）を持つ", () => {
    expect(PLANS).toHaveLength(3);
    expect(PLANS.map((p) => p.id)).toEqual(["free", "pro", "byok"]);
  });

  it("free プランが正しい構造を持つ", () => {
    const free = PLANS[0];
    expect(free.id).toBe("free");
    expect(free.name).toBe("Free");
    expect(free.price).toBe("無料");
    expect(free.monthlyMinutes).toBe(30);
    expect(free.features).toEqual([
      "月30分までの録音",
      "基本的な文字起こし",
      "10件までの議事録保存",
      "テキストエクスポート",
    ]);
    expect(free.highlighted).toBeUndefined();
  });

  it("pro プランが正しい構造を持ち、highlighted が true である", () => {
    const pro = PLANS[1];
    expect(pro.id).toBe("pro");
    expect(pro.name).toBe("Pro");
    expect(pro.price).toBe("¥500/月");
    expect(pro.monthlyMinutes).toBe(120);
    expect(pro.features).toEqual([
      "月120分までの録音",
      "高品質文字起こし",
      "無制限の議事録保存",
      "フォルダ・タグ管理",
      "Markdownエクスポート",
      "優先処理",
    ]);
    expect(pro.highlighted).toBe(true);
  });

  it("byok プランが正しい構造を持つ", () => {
    const byok = PLANS[2];
    expect(byok.id).toBe("byok");
    expect(byok.name).toBe("Max");
    expect(byok.price).toBe("¥1,500/月");
    expect(byok.monthlyMinutes).toBe(600);
    expect(byok.features).toEqual([
      "月10時間（600分）までの録音",
      "最優先・高精度文字起こし",
      "無制限の議事録保存",
      "すべての管理機能",
      "チーム共有機能",
      "専用APIキー設定",
    ]);
    expect(byok.highlighted).toBeUndefined();
  });

  it("pro プランのみが highlighted である", () => {
    const highlightedPlans = PLANS.filter((p) => p.highlighted);
    expect(highlightedPlans).toHaveLength(1);
    expect(highlightedPlans[0].id).toBe("pro");
  });
});

describe("PLAN_LIMITS", () => {
  it("free, pro, byok の3つのキーを持つ", () => {
    const plans: SubscriptionPlan[] = ["free", "pro", "byok"];
    for (const plan of plans) {
      expect(PLAN_LIMITS).toHaveProperty(plan);
    }
    expect(Object.keys(PLAN_LIMITS)).toHaveLength(3);
  });

  it("各プランの制限値が数値または Infinity である", () => {
    const plans: SubscriptionPlan[] = ["free", "pro", "byok"];
    for (const plan of plans) {
      const limit = PLAN_LIMITS[plan];
      expect(typeof limit === "number" && (limit === Infinity || Number.isFinite(limit))).toBe(true);
    }
  });
});
