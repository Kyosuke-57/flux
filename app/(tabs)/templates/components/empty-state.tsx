import React from "react";
import { EmptyState as CommonEmptyState } from "../../../../src/components/EmptyState";
import type { ColorsLight } from "../../../../src/theme";

type Props = {
  type: "no-templates" | "no-results";
  onCreate?: () => void;
  color: typeof ColorsLight;
};

export function EmptyState({ type, onCreate, color }: Props) {
  if (type === "no-templates") {
    return (
      <CommonEmptyState
        title="テンプレートがまだありません"
        subtext="テンプレートを作成すると、新しい議事録の雛形として利用できます。"
        actionLabel={onCreate ? "+ テンプレートを作成" : undefined}
        onAction={onCreate}
        color={color}
      />
    );
  }

  return (
    <CommonEmptyState
      title="該当するテンプレートがありません"
      subtext="検索条件を変えてみてください"
      color={color}
    />
  );
}
