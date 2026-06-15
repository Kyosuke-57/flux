import React from "react";
import { EmptyState as CommonEmptyState } from "../../../../src/components/EmptyState";
import type { ColorsLight } from "../../../../src/theme";

type Props = {
  type: "no-jobs" | "no-results";
  onCreate?: () => void;
  color: typeof ColorsLight;
};

export function EmptyState({ type, onCreate, color }: Props) {
  if (type === "no-jobs") {
    return (
      <CommonEmptyState
        title="文字起こしジョブがありません"
        subtext="録音から文字起こしを開始すると、ここにジョブが表示されます"
        actionLabel={onCreate ? "+ 新規ジョブを作成" : undefined}
        onAction={onCreate}
        color={color}
      />
    );
  }

  return (
    <CommonEmptyState
      title="該当するジョブがありません"
      subtext="フィルター条件を変えてみてください"
      color={color}
    />
  );
}
