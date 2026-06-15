import React from "react";
import { EmptyState as CommonEmptyState } from "../../../../src/components/EmptyState";
import type { ColorsLight } from "../../../../src/theme";

type Props = {
  type: "no-minutes" | "no-results";
  onRecord?: () => void;
  color: typeof ColorsLight;
};

export function EmptyState({ type, onRecord, color }: Props) {
  if (type === "no-minutes") {
    return (
      <CommonEmptyState
        title="まだ議事録がありません"
        subtext="会議を録音して、最初の議事録を作成しましょう"
        actionLabel={onRecord ? "+ 会議を録音" : undefined}
        onAction={onRecord}
        color={color}
      />
    );
  }

  return (
    <CommonEmptyState
      title="該当する議事録がありません"
      subtext="検索条件を変えてみてください"
      color={color}
    />
  );
}
