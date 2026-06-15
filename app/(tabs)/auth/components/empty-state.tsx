import React from "react";
import { EmptyState as CommonEmptyState } from "../../../../src/components/EmptyState";
import type { ColorsLight } from "../../../../src/theme";

type Props = {
  onAdd: () => void;
  color: typeof ColorsLight;
};

export function EmptyState({ onAdd, color }: Props) {
  return (
    <CommonEmptyState
      title="認証データがありません"
      subtext="APIキーや外部サービス認証情報を追加すると、BYOKなどの連携機能が利用できます"
      actionLabel="+ 認証データを追加"
      onAction={onAdd}
      color={color}
    />
  );
}
