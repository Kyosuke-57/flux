import React from "react";
import { EmptyState as CommonEmptyState } from "../../../../src/components/EmptyState";
import type { ColorsLight } from "../../../../src/theme";

type Props = {
  color: typeof ColorsLight;
};

export function EmptyState({ color }: Props) {
  return (
    <CommonEmptyState
      title="パイプラインジョブがありません"
      subtext="録音した音声の文字起こし処理がここに表示されます"
      color={color}
    />
  );
}
