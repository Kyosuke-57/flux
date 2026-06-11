import { supabase } from "../lib/supabase";
import type { SubscriptionPlan } from "../types";
import { PLAN_LIMITS } from "../types";

/**
 * Get the current user's subscription status including plan and usage.
 * Falls back to free plan if the users table doesn't exist yet.
 */
export async function getSubscriptionStatus() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { data: null, error: authError ?? new Error("Not authenticated") };
  }

  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("subscription_tier, monthly_usage_seconds, monthly_limit_seconds")
    .eq("id", user.id)
    .single();

  if (userError) {
    // users table might not exist yet, return free plan defaults
    console.warn("subscription: users table not available, defaulting to free", userError.message);
    return {
      data: {
        plan: "free" as SubscriptionPlan,
        usageSeconds: 0,
        limitSeconds: PLAN_LIMITS.free,
      },
      error: null,
    };
  }

  return {
    data: {
      plan: userData.subscription_tier as SubscriptionPlan,
      usageSeconds: userData.monthly_usage_seconds ?? 0,
      limitSeconds: userData.monthly_limit_seconds ?? PLAN_LIMITS[userData.subscription_tier as SubscriptionPlan] ?? 600,
    },
    error: null,
  };
}

/**
 * Returns the remaining recording time in seconds for the current user.
 */
export async function getUsageRemaining(): Promise<{ remaining: number | null; error: Error | null }> {
  const { data, error } = await getSubscriptionStatus();

  if (error || !data) {
    return { remaining: null, error };
  }

  const limit = data.limitSeconds;
  const remaining = limit === Infinity ? Infinity : Math.max(0, limit - data.usageSeconds);

  return { remaining, error: null };
}

/**
 * Increments the current user's monthly_usage_seconds by the given amount.
 */
export async function updateUsage(secondsToAdd: number) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { data: null, error: authError ?? new Error("Not authenticated") };
  }

  const { data, error } = await supabase.rpc("increment_usage", {
    user_id: user.id,
    seconds: secondsToAdd,
  });

  if (error) {
    // Fallback: directly update the row if the RPC doesn't exist
    const { data: current, error: fetchError } = await supabase
      .from("users")
      .select("monthly_usage_seconds")
      .eq("id", user.id)
      .single();

    if (fetchError) {
      return { data: null, error: fetchError };
    }

    const currentSeconds = current.monthly_usage_seconds ?? 0;
    const { data: updateData, error: updateError } = await supabase
      .from("users")
      .update({ monthly_usage_seconds: currentSeconds + secondsToAdd })
      .eq("id", user.id)
      .select()
      .single();

    return { data: updateData, error: updateError };
  }

  return { data, error: null };
}

/**
 * Returns true if the current user is allowed to record (has not exceeded their plan limit).
 */
export async function checkUsageLimit(): Promise<{ allowed: boolean; error: Error | null }> {
  const { data, error } = await getSubscriptionStatus();

  if (error || !data) {
    return { allowed: false, error };
  }

  const allowed = data.usageSeconds < data.limitSeconds;
  return { allowed, error: null };
}

/**
 * Resets monthly_usage_seconds for all users.
 *
 * ⚠️ この関数は管理者専用のサーバーサイド関数（cron job）で呼び出すべきです。
 * クライアントからの呼び出しは RLS ポリシーで制限してください。
 * 現在は認証チェックのみ行っています。
 */
export async function resetMonthlyUsage() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { data: null, error: authError ?? new Error("認証されていません") };
  }

  // TODO: 管理者ロールのチェックを追加する
  // 例: const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  console.warn("resetMonthlyUsage: クライアントからの月次リセットは推奨されません。サーバーサイドの cron job を使用してください。");

  const { data, error } = await supabase
    .from("users")
    .update({ monthly_usage_seconds: 0 })
    .neq("id", ""); // update all rows

  return { data, error };
}

/**
 * STUB: RevenueCat SDK integration for managing entitlements.
 *
 * ⚠️ この関数はスタブです。実際の実装に置き換えてください。
 * 本番環境では RevenueCat SDK を設定し、この関数を置き換える必要があります。
 */
export async function getRevenueCatEntitlements() {
  console.warn("STUB: RevenueCat SDK not yet configured — returning stub.");
  return { entitlements: null };
}

/**
 * STUB: Creates a Stripe checkout session for upgrading/downgrading plans.
 *
 * ⚠️ この関数はスタブです。実際の実装に置き換えてください。
 * 本番環境ではサーバーサイドの Stripe Checkout Session 作成エンドポイントと連携する必要があります。
 */
export async function createStripeCheckoutSession(plan: SubscriptionPlan) {
  console.warn("STUB: Stripe integration not yet configured — returning stub.", { plan });
  return { sessionUrl: null, error: new Error("Stripe checkout not configured") };
}
