import React from "react";
import { EmptyState as CommonEmptyState } from "../../../../src/components/EmptyState";
import type { ColorsLight } from "../../../../src/theme";

type Props = {
  type: "no-folders" | "no-results";
  onCreate?: () => void;
  color: typeof ColorsLight;
};

export function EmptyState({ type, onCreate, color }: Props) {
  if (type === "no-folders") {
    return (
      <CommonEmptyState
        title="フォルダがありません"
        subtext="フォルダを作成して、議事録を整理しましょう"
        actionLabel={onCreate ? "+ フォルダを作成" : undefined}
        onAction={onCreate}
        color={color}
      />
    );
  }

  return (
    <CommonEmptyState
      title="該当するフォルダがありません"
      subtext="検索条件を変えてみてください"
      color={color}
    />
  );
}
