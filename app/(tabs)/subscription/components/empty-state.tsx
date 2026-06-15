import React from "react";
import { EmptyState as CommonEmptyState } from "../../../../src/components/EmptyState";
import type { ColorsLight } from "../../../../src/theme";

type Props = {
  type: "no-subscription" | "no-auth";
  color: typeof ColorsLight;
};

export function EmptyState({ type, color }: Props) {
  if (type === "no-subscription") {
    return (
      <CommonEmptyState
        title="サブスクリプション情報がありません"
        subtext="プラン情報を読み込めませんでした。"
        color={color}
      />
    );
  }

  return (
    <CommonEmptyState
      title="サインインしてください"
      subtext="サブスクリプションの表示・管理にはログインが必要です。"
      color={color}
    />
  );
}
