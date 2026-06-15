import React from "react";
import type { ColorsLight } from "../../../../src/theme";
import {
  LoadingSkeleton as CommonLoadingSkeleton,
  UnauthenticatedView as CommonUnauthenticatedView,
} from "../../../../src/components/FeatureSkeleton";

type Props = {
  color: typeof ColorsLight;
};

/** ローディング中のスケルトン表示 */
export function LoadingSkeleton({ color }: Props) {
  return <CommonLoadingSkeleton title="議事録" variant="search" color={color} />;
}

/** 未認証時の表示 */
export function UnauthenticatedView({ color }: Props) {
  return (
    <CommonUnauthenticatedView
      color={color}
      message="議事録の表示・管理にはログインが必要です。"
    />
  );
}
