import React from "react";
import type { ColorsLight } from "../../../../src/theme";
import { LoadingSkeleton as CommonLoadingSkeleton } from "../../../../src/components/FeatureSkeleton";

type Props = {
  color: typeof ColorsLight;
};

export function LoadingSkeleton({ color }: Props) {
  return <CommonLoadingSkeleton title="エクスポート履歴" variant="search" color={color} />;
}
