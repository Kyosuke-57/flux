import React from "react";
import { EmptyState as CommonEmptyState } from "../../../../src/components/EmptyState";
import type { ColorsLight } from "../../../../src/theme";

type Props = {
  color: typeof ColorsLight;
  onCreate: () => void;
};

export function EmptyState({ color, onCreate }: Props) {
  return (
    <CommonEmptyState
      title="録音データがありません"
      subtext="保存した録音データがここに表示されます"
      actionLabel="+ 新規作成"
      onAction={onCreate}
      color={color}
    />
  );
}
