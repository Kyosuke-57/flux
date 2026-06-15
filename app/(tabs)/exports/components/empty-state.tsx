import React from "react";
import { EmptyState as CommonEmptyState } from "../../../../src/components/EmptyState";
import type { ColorsLight } from "../../../../src/theme";

type Props = {
  type: "no-exports" | "no-results";
  onCreate?: () => void;
  color: typeof ColorsLight;
};

export function EmptyState({ type, onCreate, color }: Props) {
  if (type === "no-exports") {
    return (
      <CommonEmptyState
        title="エクスポート履歴がまだありません"
        subtext="議事録をエクスポートすると、ここに履歴が表示されます。"
        actionLabel={onCreate ? "+ エクスポートを作成" : undefined}
        onAction={onCreate}
        color={color}
      />
    );
  }

  return (
    <CommonEmptyState
      title="該当するエクスポートがありません"
      subtext="検索条件を変えてみてください"
      color={color}
    />
  );
}
