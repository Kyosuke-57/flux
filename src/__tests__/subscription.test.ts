import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================
// Hoisted mock references — runs before all vi.mock factories
// ============================================================
const { mockRequireUser, mockSupabase, mockPlatform, createQB } = vi.hoisted(() => {
  const createQB = () => {
    const qb: Record<string, any> = {};
    // Default thenable result (used when chain ends without .single())
    qb._resolveData = { data: null, error: null };

    const chain = ["select", "insert", "update", "delete", "eq", "neq", "order", "limit"];
    for (const m of chain) {
      qb[m] = vi.fn(() => qb);
    }
    qb.single = vi.fn().mockResolvedValue({ data: null, error: null });
    qb.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    // Thenable — for queries that end with a filter (no .single())
    qb.then = (onfulfilled: (value: any) => any) =>
      Promise.resolve(qb._resolveData).then(onfulfilled);
    return qb;
  };

  const mockSupabase = {
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: null }, error: null }),
    },
    from: vi.fn(() => createQB()),
    rpc: vi
      .fn()
      .mockResolvedValue({ data: null, error: new Error("RPC not found") }),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    })),
  };

  const mockRequireUser = vi
    .fn()
    .mockResolvedValue({ user: null, error: new Error("Not authenticated") });
  const mockPlatform = { select: vi.fn() };

  return { mockRequireUser, mockSupabase, mockPlatform, createQB };
});

// ============================================================
// Module-level mocks
// ============================================================
vi.mock("../lib/supabase", () => ({
  supabase: mockSupabase,
  requireUser: mockRequireUser,
}));

vi.mock("react-native", () => ({
  Platform: mockPlatform,
}));

// Existing mocks (kept for compatibility)
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: null }, error: null }),
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

vi.mock("react-native-purchases", () => ({
  default: {
    configure: vi.fn(),
    getCustomerInfo: vi
      .fn()
      .mockResolvedValue({ entitlements: { active: {} } }),
    getOfferings: vi.fn().mockResolvedValue({ current: null }),
    purchasePackage: vi.fn(),
    ENTITLEMENT_VERIFICATION_MODE: { ENFORCED: "enforced" },
    VERIFICATION_RESULT: { VERIFIED: "verified" },
    PURCHASES_ERROR_CODE: { PURCHASE_CANCELLED_ERROR: "purchase_cancelled" },
  },
}));

// ============================================================
// Imports
// ============================================================
import {
  getSubscriptionStatus,
  getUsageRemaining,
  updateUsage,
  checkUsageLimit,
  resetMonthlyUsage,
  configureRevenueCat,
  getRevenueCatEntitlements,
  purchasePlan,
  syncRevenueCatEntitlements,
  createStripeCheckoutSession,
  PLANS,
} from "../services/subscription";
import { PLAN_LIMITS, type SubscriptionPlan } from "../types";
import Purchases from "react-native-purchases";

// ============================================================
// Setup
// ============================================================
beforeEach(() => {
  vi.clearAllMocks();
  // Re-apply defaults cleared by clearAllMocks for non-vi.fn() state
  delete process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
  delete process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;
});

// ============================================================
// Existing tests (PLANS, PLAN_LIMITS)
// ============================================================

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
      expect(
        typeof limit === "number" && (limit === Infinity || Number.isFinite(limit)),
      ).toBe(true);
    }
  });
});

// ============================================================
// getSubscriptionStatus
// ============================================================
describe("getSubscriptionStatus", () => {
  it("認証エラーの場合 { data: null, error } を返す", async () => {
    mockRequireUser.mockResolvedValueOnce({
      user: null,
      error: new Error("認証切れ"),
    });

    const result = await getSubscriptionStatus();

    expect(result).toEqual({ data: null, error: new Error("認証切れ") });
  });

  it("users テーブルが存在しない場合、free プランのデフォルト値を返す", async () => {
    mockRequireUser.mockResolvedValueOnce({
      user: { id: "user-1" },
      error: null,
    });
    const qb = createQB();
    qb.single.mockResolvedValueOnce({
      data: null,
      error: new Error("relation 'users' does not exist"),
    });
    mockSupabase.from.mockReturnValueOnce(qb);

    const result = await getSubscriptionStatus();

    expect(result).toEqual({
      data: {
        plan: "free",
        usageSeconds: 0,
        limitSeconds: PLAN_LIMITS.free,
      },
      error: null,
    });
  });

  it("正常な場合、ユーザーのプラン情報を返す", async () => {
    mockRequireUser.mockResolvedValueOnce({
      user: { id: "user-1" },
      error: null,
    });
    const qb = createQB();
    qb.single.mockResolvedValueOnce({
      data: {
        subscription_tier: "pro",
        monthly_usage_seconds: 300,
        monthly_limit_seconds: 7200,
      },
      error: null,
    });
    mockSupabase.from.mockReturnValueOnce(qb);

    const result = await getSubscriptionStatus();

    expect(result).toEqual({
      data: {
        plan: "pro",
        usageSeconds: 300,
        limitSeconds: 7200,
      },
      error: null,
    });
  });

  it("monthly_limit_seconds が null の場合、PLAN_LIMITS からフォールバックする", async () => {
    mockRequireUser.mockResolvedValueOnce({
      user: { id: "user-1" },
      error: null,
    });
    const qb = createQB();
    qb.single.mockResolvedValueOnce({
      data: {
        subscription_tier: "pro",
        monthly_usage_seconds: 100,
        monthly_limit_seconds: null,
      },
      error: null,
    });
    mockSupabase.from.mockReturnValueOnce(qb);

    const result = await getSubscriptionStatus();

    // PLAN_LIMITS.pro is Infinity (from types/index.ts)
    expect(result.data!.usageSeconds).toBe(100);
    expect(result.data!.limitSeconds).toBe(PLAN_LIMITS.pro);
  });

  it("subscription_tier が PLAN_LIMITS に無い場合、デフォルト値 600 でフォールバックする", async () => {
    mockRequireUser.mockResolvedValueOnce({
      user: { id: "user-1" },
      error: null,
    });
    const qb = createQB();
    qb.single.mockResolvedValueOnce({
      data: {
        subscription_tier: "unknown_tier",
        monthly_usage_seconds: 50,
        monthly_limit_seconds: null,
      },
      error: null,
    });
    mockSupabase.from.mockReturnValueOnce(qb);

    const result = await getSubscriptionStatus();

    expect(result.data!.usageSeconds).toBe(50);
    expect(result.data!.limitSeconds).toBe(600);
  });

  it("monthly_usage_seconds が null の場合、0 として扱う", async () => {
    mockRequireUser.mockResolvedValueOnce({
      user: { id: "user-1" },
      error: null,
    });
    const qb = createQB();
    qb.single.mockResolvedValueOnce({
      data: {
        subscription_tier: "free",
        monthly_usage_seconds: null,
        monthly_limit_seconds: null,
      },
      error: null,
    });
    mockSupabase.from.mockReturnValueOnce(qb);

    const result = await getSubscriptionStatus();

    expect(result.data!.usageSeconds).toBe(0);
  });
});

// ============================================================
// getUsageRemaining
// ============================================================
describe("getUsageRemaining", () => {
  it("getSubscriptionStatus がエラーを返す場合、remaining: null を返す", async () => {
    mockRequireUser.mockResolvedValueOnce({
      user: null,
      error: new Error("認証エラー"),
    });

    const result = await getUsageRemaining();

    expect(result).toEqual({ remaining: null, error: new Error("認証エラー") });
  });

  it("limitSeconds が Infinity の場合、remaining も Infinity", async () => {
    mockRequireUser.mockResolvedValueOnce({
      user: { id: "user-1" },
      error: null,
    });
    const qb = createQB();
    qb.single.mockResolvedValueOnce({
      data: {
        subscription_tier: "free",
        monthly_usage_seconds: 100,
        monthly_limit_seconds: Infinity,
      },
      error: null,
    });
    mockSupabase.from.mockReturnValueOnce(qb);

    const result = await getUsageRemaining();

    expect(result).toEqual({ remaining: Infinity, error: null });
  });

  it("利用可能な残り時間を正しく計算する", async () => {
    mockRequireUser.mockResolvedValueOnce({
      user: { id: "user-1" },
      error: null,
    });
    const qb = createQB();
    qb.single.mockResolvedValueOnce({
      data: {
        subscription_tier: "pro",
        monthly_usage_seconds: 300,
        monthly_limit_seconds: 7200,
      },
      error: null,
    });
    mockSupabase.from.mockReturnValueOnce(qb);

    const result = await getUsageRemaining();

    expect(result).toEqual({ remaining: 6900, error: null });
  });

  it("利用時間が上限を超えている場合、remaining は 0", async () => {
    mockRequireUser.mockResolvedValueOnce({
      user: { id: "user-1" },
      error: null,
    });
    const qb = createQB();
    qb.single.mockResolvedValueOnce({
      data: {
        subscription_tier: "free",
        monthly_usage_seconds: 99999,
        monthly_limit_seconds: 1800,
      },
      error: null,
    });
    mockSupabase.from.mockReturnValueOnce(qb);

    const result = await getUsageRemaining();

    expect(result).toEqual({ remaining: 0, error: null });
  });
});

// ============================================================
// updateUsage
// ============================================================
describe("updateUsage", () => {
  it("認証エラーの場合エラーを返す", async () => {
    mockRequireUser.mockResolvedValueOnce({
      user: null,
      error: new Error("認証切れ"),
    });

    const result = await updateUsage(60);

    expect(result).toEqual({ data: null, error: new Error("認証切れ") });
  });

  it("RPC increment_usage が成功した場合そのデータを返す", async () => {
    mockRequireUser.mockResolvedValueOnce({
      user: { id: "user-1" },
      error: null,
    });
    mockSupabase.rpc.mockResolvedValueOnce({
      data: { success: true },
      error: null,
    });

    const result = await updateUsage(120);

    expect(mockSupabase.rpc).toHaveBeenCalledWith("increment_usage", {
      user_id: "user-1",
      seconds: 120,
    });
    expect(result).toEqual({ data: { success: true }, error: null });
  });

  it("RPC が失敗した場合、フォールバックで直接更新を試みる", async () => {
    mockRequireUser.mockResolvedValueOnce({
      user: { id: "user-1" },
      error: null,
    });
    // RPC が失敗
    mockSupabase.rpc.mockResolvedValueOnce({
      data: null,
      error: new Error("RPC not found"),
    });

    // フォールバック: 現在値を取得 → 更新
    const qbSelect = createQB();
    qbSelect.single.mockResolvedValueOnce({
      data: { monthly_usage_seconds: 100 },
      error: null,
    });
    const qbUpdate = createQB();
    qbUpdate.single.mockResolvedValueOnce({
      data: { monthly_usage_seconds: 160 },
      error: null,
    });
    mockSupabase.from
      .mockReturnValueOnce(qbSelect) // SELECT
      .mockReturnValueOnce(qbUpdate); // UPDATE

    const result = await updateUsage(60);

    expect(qbUpdate.update).toHaveBeenCalledWith({
      monthly_usage_seconds: 160,
    });
    expect(result).toEqual({
      data: { monthly_usage_seconds: 160 },
      error: null,
    });
  });

  it("フォールバックの SELECT が失敗した場合エラーを返す", async () => {
    mockRequireUser.mockResolvedValueOnce({
      user: { id: "user-1" },
      error: null,
    });
    mockSupabase.rpc.mockResolvedValueOnce({
      data: null,
      error: new Error("RPC not found"),
    });

    const qbSelect = createQB();
    qbSelect.single.mockResolvedValueOnce({
      data: null,
      error: new Error("fetch error"),
    });
    mockSupabase.from.mockReturnValueOnce(qbSelect);

    const result = await updateUsage(60);

    expect(result).toEqual({ data: null, error: new Error("fetch error") });
  });
});

// ============================================================
// checkUsageLimit
// ============================================================
describe("checkUsageLimit", () => {
  it("getSubscriptionStatus がエラーの場合 allowed: false", async () => {
    mockRequireUser.mockResolvedValueOnce({
      user: null,
      error: new Error("認証エラー"),
    });

    const result = await checkUsageLimit();

    expect(result).toEqual({ allowed: false, error: new Error("認証エラー") });
  });

  it("利用時間が上限未満の場合 allowed: true", async () => {
    mockRequireUser.mockResolvedValueOnce({
      user: { id: "user-1" },
      error: null,
    });
    const qb = createQB();
    qb.single.mockResolvedValueOnce({
      data: {
        subscription_tier: "free",
        monthly_usage_seconds: 100,
        monthly_limit_seconds: 1800,
      },
      error: null,
    });
    mockSupabase.from.mockReturnValueOnce(qb);

    const result = await checkUsageLimit();

    expect(result).toEqual({ allowed: true, error: null });
  });

  it("利用時間が上限以上の場合 allowed: false", async () => {
    mockRequireUser.mockResolvedValueOnce({
      user: { id: "user-1" },
      error: null,
    });
    const qb = createQB();
    qb.single.mockResolvedValueOnce({
      data: {
        subscription_tier: "free",
        monthly_usage_seconds: 1800,
        monthly_limit_seconds: 1800,
      },
      error: null,
    });
    mockSupabase.from.mockReturnValueOnce(qb);

    const result = await checkUsageLimit();

    expect(result).toEqual({ allowed: false, error: null });
  });
});

// ============================================================
// resetMonthlyUsage
// ============================================================
describe("resetMonthlyUsage", () => {
  it("全ユーザーの monthly_usage_seconds を 0 にリセットする", async () => {
    const qb = createQB();
    qb._resolveData = { data: null, error: null };
    mockSupabase.from.mockReturnValueOnce(qb);

    const result = await resetMonthlyUsage();

    expect(mockSupabase.from).toHaveBeenCalledWith("users");
    expect(qb.update).toHaveBeenCalledWith({ monthly_usage_seconds: 0 });
    expect(qb.neq).toHaveBeenCalledWith("id", "");
    expect(result).toEqual({ data: null, error: null });
  });

  it("エラーが発生した場合エラーを返す", async () => {
    const qb = createQB();
    qb._resolveData = { data: null, error: new Error("DB error") };
    mockSupabase.from.mockReturnValueOnce(qb);

    const result = await resetMonthlyUsage();

    expect(result).toEqual({ data: null, error: new Error("DB error") });
  });
});

// ============================================================
// configureRevenueCat
// ============================================================
describe("configureRevenueCat", () => {
  it("API キーがない場合、Purchases.configure を呼ばずに warning を出す", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockPlatform.select.mockReturnValue(undefined);

    configureRevenueCat();

    expect(Purchases.configure).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("RevenueCat API key not found"),
    );
    warnSpy.mockRestore();
  });

  it("iOS の API キーがある場合、Purchases.configure を iOS のキーで呼ぶ", () => {
    mockPlatform.select.mockImplementation((obj: Record<string, string>) => obj.ios);
    process.env.EXPO_PUBLIC_REVENUECAT_API_KEY = "rc_ios_key";

    configureRevenueCat();

    expect(Purchases.configure).toHaveBeenCalledWith({ apiKey: "rc_ios_key" });
  });

  it("Android の API キーがある場合、Purchases.configure を Android のキーで呼ぶ", () => {
    mockPlatform.select.mockImplementation((obj: Record<string, string>) => obj.android);
    process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY = "rc_android_key";

    configureRevenueCat();

    expect(Purchases.configure).toHaveBeenCalledWith({
      apiKey: "rc_android_key",
    });
  });
});

// ============================================================
// getRevenueCatEntitlements
// ============================================================
describe("getRevenueCatEntitlements", () => {
  it("有効なエンタイトルメントがある場合それを返す", async () => {
    const activeEntitlements = {
      pro: { identifier: "pro" },
    };
    (Purchases.getCustomerInfo as any).mockResolvedValueOnce({
      entitlements: { active: activeEntitlements },
    });

    const result = await getRevenueCatEntitlements();

    expect(result).toEqual({ entitlements: activeEntitlements });
  });

  it("有効なエンタイトルメントがない場合 null を返す", async () => {
    (Purchases.getCustomerInfo as any).mockResolvedValueOnce({
      entitlements: { active: {} },
    });

    const result = await getRevenueCatEntitlements();

    expect(result).toEqual({ entitlements: null });
  });

  it("SDK が利用できない場合 null を返す", async () => {
    (Purchases.getCustomerInfo as any).mockRejectedValueOnce(
      new Error("SDK not configured"),
    );

    const result = await getRevenueCatEntitlements();

    expect(result).toEqual({ entitlements: null });
  });
});

// ============================================================
// purchasePlan
// ============================================================
describe("purchasePlan", () => {
  it('free プランの場合、updatePlanTier を呼び出して成功する', async () => {
    mockRequireUser.mockResolvedValueOnce({
      user: { id: "user-1" },
      error: null,
    });
    const qb = createQB();
    qb._resolveData = { data: null, error: null };
    mockSupabase.from.mockReturnValueOnce(qb);

    const result = await purchasePlan("free");

    expect(result).toEqual({ success: true, error: null });
    expect(qb.update).toHaveBeenCalledWith({ subscription_tier: "free" });
    expect(qb.eq).toHaveBeenCalledWith("id", "user-1");
  });

  it('paid プランで offerings.current がない場合エラーを返す', async () => {
    (Purchases.getOfferings as any).mockResolvedValueOnce({ current: null });

    const result = await purchasePlan("pro");

    expect(result).toEqual({
      success: false,
      error: "RevenueCatのオファリングが利用できません",
    });
  });

  it("パッケージが見つからない場合エラーを返す", async () => {
    (Purchases.getOfferings as any).mockResolvedValueOnce({
      current: {
        availablePackages: [
          { identifier: "some_other_package" },
        ],
      },
    });

    const result = await purchasePlan("pro");

    expect(result).toEqual({
      success: false,
      error: 'プラン「pro」のパッケージが見つかりません',
    });
  });

  it("購入完了後エンタイトルメントがない場合エラーを返す", async () => {
    (Purchases.getOfferings as any).mockResolvedValueOnce({
      current: {
        availablePackages: [{ identifier: "pro_monthly" }],
      },
    });
    (Purchases.purchasePackage as any).mockResolvedValueOnce({
      customerInfo: {
        entitlements: { active: {} },
      },
    });

    const result = await purchasePlan("pro");

    expect(result).toEqual({
      success: false,
      error: "購入は完了しましたが、エンタイトルメントが有効になっていません",
    });
  });

  it("購入成功後 updatePlanTier を呼び出して成功する", async () => {
    (Purchases.getOfferings as any).mockResolvedValueOnce({
      current: {
        availablePackages: [{ identifier: "pro_monthly" }],
      },
    });
    (Purchases.purchasePackage as any).mockResolvedValueOnce({
      customerInfo: {
        entitlements: { active: { pro: { identifier: "pro" } } },
      },
    });
    // updatePlanTier
    mockRequireUser.mockResolvedValueOnce({
      user: { id: "user-1" },
      error: null,
    });
    const qb = createQB();
    qb._resolveData = { data: null, error: null };
    mockSupabase.from.mockReturnValueOnce(qb);

    const result = await purchasePlan("pro");

    expect(result).toEqual({ success: true, error: null });
    expect(qb.update).toHaveBeenCalledWith({ subscription_tier: "pro" });
  });

  it("購入がキャンセルされた場合エラー null で失敗を返す", async () => {
    (Purchases.getOfferings as any).mockResolvedValueOnce({
      current: {
        availablePackages: [{ identifier: "pro_monthly" }],
      },
    });
    const cancelError = new Error("User cancelled");
    (cancelError as any).code = "PURCHASE_CANCELLED_ERROR";
    (Purchases.purchasePackage as any).mockRejectedValueOnce(cancelError);

    const result = await purchasePlan("pro");

    expect(result).toEqual({ success: false, error: null });
  });

  it("購入が予期しないエラーで失敗した場合エラーメッセージを返す", async () => {
    (Purchases.getOfferings as any).mockResolvedValueOnce({
      current: {
        availablePackages: [{ identifier: "pro_monthly" }],
      },
    });
    (Purchases.purchasePackage as any).mockRejectedValueOnce(
      new Error("Network error"),
    );

    const result = await purchasePlan("pro");

    expect(result).toEqual({
      success: false,
      error: "購入に失敗しました",
    });
  });

  it("updatePlanTier が認証エラーになった場合エラーを返す", async () => {
    (Purchases.getOfferings as any).mockResolvedValueOnce({
      current: {
        availablePackages: [{ identifier: "pro_monthly" }],
      },
    });
    (Purchases.purchasePackage as any).mockResolvedValueOnce({
      customerInfo: {
        entitlements: { active: { pro: { identifier: "pro" } } },
      },
    });
    // updatePlanTier で認証エラー
    mockRequireUser.mockResolvedValueOnce({
      user: null,
      error: new Error("認証エラー"),
    });

    const result = await purchasePlan("pro");

    expect(result).toEqual({ success: false, error: "認証エラー" });
  });
});

// ============================================================
// syncRevenueCatEntitlements
// ============================================================
describe("syncRevenueCatEntitlements", () => {
  it("アクティブなエンタイトルメントがない場合何もしない", async () => {
    (Purchases.getCustomerInfo as any).mockResolvedValueOnce({
      entitlements: { active: {} },
    });

    await syncRevenueCatEntitlements();

    expect(mockSupabase.auth.getUser).not.toHaveBeenCalled();
  });

  it("エンタイトルメントが ENTITLEMENT_MAP に一致しない場合何もしない", async () => {
    (Purchases.getCustomerInfo as any).mockResolvedValueOnce({
      entitlements: { active: { unknown_entitlement: {} } },
    });

    await syncRevenueCatEntitlements();

    expect(mockSupabase.auth.getUser).not.toHaveBeenCalled();
  });

  it("認証ユーザーがいない場合何もしない", async () => {
    (Purchases.getCustomerInfo as any).mockResolvedValueOnce({
      entitlements: { active: { pro: { identifier: "pro" } } },
    });
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });

    await syncRevenueCatEntitlements();

    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("現在の tier が同じ場合更新しない", async () => {
    (Purchases.getCustomerInfo as any).mockResolvedValueOnce({
      entitlements: { active: { pro: { identifier: "pro" } } },
    });
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });
    const qb = createQB();
    qb.single.mockResolvedValueOnce({
      data: { subscription_tier: "pro" },
      error: null,
    });
    mockSupabase.from.mockReturnValueOnce(qb);

    await syncRevenueCatEntitlements();

    // from should be called only once (select, not update)
    expect(mockSupabase.from).toHaveBeenCalledTimes(1);
  });

  it("現在の tier が異なる場合更新する", async () => {
    (Purchases.getCustomerInfo as any).mockResolvedValueOnce({
      entitlements: { active: { pro: { identifier: "pro" } } },
    });
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });

    // SELECT query → returns "free" tier
    const qbSelect = createQB();
    qbSelect.single.mockResolvedValueOnce({
      data: { subscription_tier: "free" },
      error: null,
    });
    // UPDATE query → thenable chain
    const qbUpdate = createQB();
    qbUpdate._resolveData = { data: null, error: null };
    mockSupabase.from
      .mockReturnValueOnce(qbSelect)
      .mockReturnValueOnce(qbUpdate);

    await syncRevenueCatEntitlements();

    expect(mockSupabase.from).toHaveBeenCalledTimes(2);
    expect(qbUpdate.update).toHaveBeenCalledWith({
      subscription_tier: "pro",
    });
  });

  it("エラーが発生しても例外を投げずに warning を出す", async () => {
    // getRevenueCatEntitlements は成功させるが、supabase.auth.getUser でエラーを発生させる
    (Purchases.getCustomerInfo as any).mockResolvedValueOnce({
      entitlements: { active: { pro: { identifier: "pro" } } },
    });
    mockSupabase.auth.getUser.mockImplementationOnce(() => {
      throw new Error("Unexpected error");
    });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(syncRevenueCatEntitlements()).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(
      "Failed to sync RevenueCat entitlements:",
      expect.any(Error),
    );
    warnSpy.mockRestore();
  });
});

// ============================================================
// createStripeCheckoutSession
// ============================================================
describe("createStripeCheckoutSession", () => {
  it("スタブのレスポンスを返す", async () => {
    const result = await createStripeCheckoutSession("pro");

    expect(result).toEqual({
      sessionUrl: null,
      error: new Error("Stripe checkout not configured"),
    });
  });
});
