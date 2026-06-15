import React from "react";
import type { ColorsLight } from "../../../../src/theme";
import { LoadingSkeleton as CommonLoadingSkeleton } from "../../../../src/components/FeatureSkeleton";

type Props = {
  color: typeof ColorsLight;
};

/** ローディング中のスケルトン表示 */
export function LoadingSkeleton({ color }: Props) {
  return <CommonLoadingSkeleton title="フォルダ" variant="list" color={color} />;
}
