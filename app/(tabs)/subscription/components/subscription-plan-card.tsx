import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../../../../src/components/Glass";
import { Spacing, BorderRadius } from "../../../../src/theme";
import type { PlanInfo } from "../../../../src/services/subscription";
import type { SubscriptionPlan } from "../../../../src/types";
import type { ColorsLight } from "../../../../src/theme";
import { getPlanColor, getPlanIcon } from "../hooks/utils";

type Props = {
  plan: PlanInfo;
  currentPlan: SubscriptionPlan | null;
  upgrading: string | null;
  onPurchase: (planId: SubscriptionPlan) => void;
  color: typeof ColorsLight;
  isDark: boolean;
};

export function SubscriptionPlanCard({
  plan,
  currentPlan,
  upgrading,
  onPurchase,
  color,
  isDark,
}: Props) {
  const isCurrentPlan = currentPlan === plan.id;
  const isUpgrading = upgrading === plan.id;
  const planAccent = getPlanColor(plan.id, isDark);
  const planIcon = getPlanIcon(plan.id);

  return (
    <GlassCard
      style={{
        ...styles.card,
        ...(plan.highlighted ? {
          borderColor: planAccent,
          borderWidth: 1.5,
        } : {}),
      } as ViewStyle}
    >
      {/* Header row: icon + name + current badge */}
      <View style={styles.headerRow}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: color.primaryBg },
          ]}
        >
          <Ionicons name={planIcon as any} size={20} color={planAccent} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.planName, { color: color.textPrimary }]}>
            {plan.name}
          </Text>
          <Text style={[styles.planPrice, { color: planAccent }]}>
            {plan.price}
          </Text>
        </View>
        {isCurrentPlan && (
          <View
            style={[styles.currentBadge, { backgroundColor: color.primaryBg }]}
          >
            <Text style={[styles.currentBadgeText, { color: color.primary }]}>
              現在のプラン
            </Text>
          </View>
        )}
      </View>

      {/* Monthly minutes */}
      <Text style={[styles.minutesInfo, { color: color.textSecondary }]}>
        月{plan.monthlyMinutes}分までの録音
      </Text>

      {/* Features */}
      <View style={styles.featuresList}>
        {plan.features.map((feature, i) => (
          <View key={i} style={styles.featureRow}>
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={color.success}
              style={styles.featureIcon}
            />
            <Text style={[styles.featureText, { color: color.textPrimary }]}>
              {feature}
            </Text>
          </View>
        ))}
      </View>

      {/* Purchase button */}
      {!isCurrentPlan && (
        <TouchableOpacity
          style={[
            styles.purchaseButton,
            {
              backgroundColor: plan.highlighted
                ? planAccent
                : color.surfaceSecondary,
              borderColor: plan.highlighted ? planAccent : color.border,
              opacity: isUpgrading ? 0.6 : 1,
            },
          ]}
          onPress={() => onPurchase(plan.id)}
          disabled={isUpgrading}
          accessibilityLabel={`${plan.name}プランに変更`}
        >
          <Text
            style={[
              styles.purchaseButtonText,
              {
                color: plan.highlighted
                  ? color.textInverse
                  : color.textPrimary,
              },
            ]}
          >
            {isUpgrading
              ? "変更中..."
              : plan.id === "free"
                ? "無料プランに変更"
                : "このプランに変更"}
          </Text>
        </TouchableOpacity>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 24,
    marginTop: 8,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  planName: {
    fontSize: 17,
    fontWeight: "700",
  },
  planPrice: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
  currentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  minutesInfo: {
    fontSize: 13,
    marginTop: 10,
    marginLeft: 52,
  },
  featuresList: {
    marginTop: 12,
    marginLeft: 52,
    gap: 6,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  featureIcon: {
    marginRight: 6,
  },
  featureText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  purchaseButton: {
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  purchaseButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
