// ─── サブスクリプション画面 データ管理フック ─────────────────

import { useState, useEffect, useCallback } from "react";
import { Alert } from "react-native";
import { useAuth } from "../../../../src/contexts/AuthContext";
import { useToast } from "../../../../src/contexts/ToastContext";
import {
  getSubscriptionStatus,
  purchasePlan,
  PLANS,
  type PlanInfo,
} from "../../../../src/services/subscription";
import type { SubscriptionPlan } from "../../../../src/types";
import { formatDate, secondsToHms } from "./utils";

// ─── 型定義 ────────────────────────────────────────────────

/** getSubscriptionStatus() の戻り値 data 部分 */
interface PlanStatus {
  plan: SubscriptionPlan;
  usageSeconds: number;
  limitSeconds: number;
}

// ─── カスタムフック ─────────────────────────────────────────

export function useSubscriptionData() {
  const { user } = useAuth();
  const { showToast } = useToast();

  // ── データ状態 ──
  const [currentPlan, setCurrentPlan] = useState<PlanStatus | null>(null);

  // ── UI状態 ──
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  // ── データ取得 ──
  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const { data } = await getSubscriptionStatus();
    if (data) {
      setCurrentPlan(data);
    }
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── プルリフレッシュ ──
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  // ── プラン購入 ──
  const handlePurchase = useCallback(
    async (planId: SubscriptionPlan) => {
      setUpgrading(planId);
      const { success, error } = await purchasePlan(planId);
      if (success) {
        showToast({ message: "プランを変更しました", type: "success" });
        await fetchData();
      } else if (error) {
        showToast({ message: error, type: "error" });
      }
      setUpgrading(null);
    },
    [fetchData, showToast],
  );

  // ── サブスクリプション解約（無料プランに戻す） ──
  const handleCancelSubscription = useCallback(() => {
    Alert.alert(
      "サブスクリプション解約",
      "無料プランに戻ります。よろしいですか？",
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "解約する",
          style: "destructive",
          onPress: async () => {
            setUpgrading("free");
            const { success, error } = await purchasePlan("free");
            if (success) {
              showToast({ message: "無料プランに戻りました", type: "info" });
              await fetchData();
            } else if (error) {
              showToast({ message: error, type: "error" });
            }
            setUpgrading(null);
          },
        },
      ],
    );
  }, [fetchData, showToast]);

  // ── 戻り値 ──
  return {
    // データ
    currentPlan,
    loading,
    refreshing,
    upgrading,

    // アクション
    fetchData,
    onRefresh,
    handlePurchase,
    handleCancelSubscription,
  };
}
