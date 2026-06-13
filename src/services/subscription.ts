import { supabase, requireUser } from "../lib/supabase";
import type { SubscriptionPlan } from "../types";
import { PLAN_LIMITS } from "../types";
import Purchases from "react-native-purchases";
import { Platform } from "react-native";

export interface PlanInfo {
  id: SubscriptionPlan;
  name: string;
  price: string;
  monthlyMinutes: number;
  features: string[];
  highlighted?: boolean;
}

export const PLANS: PlanInfo[] = [
  {
    id: "free",
    name: "Free",
    price: "無料",
    monthlyMinutes: 30,
    features: [
      "月30分までの録音",
      "基本的な文字起こし",
      "10件までの議事録保存",
      "テキストエクスポート",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "¥500/月",
    monthlyMinutes: 120,
    features: [
      "月120分までの録音",
      "高品質文字起こし",
      "無制限の議事録保存",
      "フォルダ・タグ管理",
      "Markdownエクスポート",
      "優先処理",
    ],
    highlighted: true,
  },
  {
    id: "byok",
    name: "Max",
    price: "¥1,500/月",
    monthlyMinutes: 600,
    features: [
      "月10時間（600分）までの録音",
      "最優先・高精度文字起こし",
      "無制限の議事録保存",
      "すべての管理機能",
      "チーム共有機能",
      "専用APIキー設定",
    ],
  },
];

/**
 * Get the current user's subscription status including plan and usage.
 * Falls back to free plan if the users table doesn't exist yet.
 */
export async function getSubscriptionStatus() {
  const { user, error: authError } = await requireUser();
  if (authError || !user) return { data: null, error: authError };

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
  const { user, error: authError } = await requireUser();
  if (authError || !user) return { data: null, error: authError };

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
 * Intended to be called periodically (e.g. via a cron job).
 */
export async function resetMonthlyUsage() {
  const { data, error } = await supabase
    .from("users")
    .update({ monthly_usage_seconds: 0 })
    .neq("id", ""); // update all rows

  return { data, error };
}

/**
 * Configure the RevenueCat SDK with the API key from environment variables.
 * Call this once at app startup (e.g. in _layout.tsx).
 *
 * Requires EXPO_PUBLIC_REVENUECAT_API_KEY (Apple/App Store) and
 * EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY (Google Play) to be set in .env.
 */
export function configureRevenueCat() {
  const apiKey = Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY,
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
    default: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY,
  });

  if (!apiKey) {
    console.warn(
      "RevenueCat API key not found. Set EXPO_PUBLIC_REVENUECAT_API_KEY (and EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY for Android) in .env"
    );
    return;
  }

  Purchases.configure({ apiKey });
}

/**
 * Fetches the current user's active entitlements via the RevenueCat SDK.
 *
 * NOTE: `configureRevenueCat()` must be called before this function.
 * Returns `{ entitlements: null }` if the SDK is not configured or the call fails.
 */
export async function getRevenueCatEntitlements() {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const active = customerInfo.entitlements.active;
    const entitlementIds = Object.keys(active);
    return {
      entitlements: entitlementIds.length > 0 ? active : null,
    };
  } catch (error) {
    console.warn("RevenueCat SDK not available or not configured — returning stub.", error);
    return { entitlements: null };
  }
}

/**
 * Placeholder: Creates a Stripe checkout session for upgrading/downgrading plans.
 * Replace with actual Stripe server call when the backend endpoint is ready.
 */
export async function createStripeCheckoutSession(plan: SubscriptionPlan) {
  // TODO: Call backend endpoint to create Stripe Checkout Session
  // Example:
  //   const response = await fetch('/api/create-checkout-session', {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ plan, userId: (await supabase.auth.getUser()).data.user?.id }),
  //   });
  //   const session = await response.json();
  //   return session;
  console.warn("Stripe integration not yet configured — returning stub.", { plan });
  return { sessionUrl: null, error: new Error("Stripe checkout not configured") };
}
