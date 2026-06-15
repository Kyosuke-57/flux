import React from "react";
import type { ColorsLight } from "../../../../src/theme";
import {
  LoadingSkeleton as CommonLoadingSkeleton,
  UnauthenticatedView as CommonUnauthenticatedView,
} from "../../../../src/components/FeatureSkeleton";

type Props = {
  color: typeof ColorsLight;
};

export function LoadingSkeleton({ color }: Props) {
  return <CommonLoadingSkeleton title="パイプライン" variant="cards" color={color} />;
}

export function UnauthenticatedView({ color }: Props) {
  return (
    <CommonUnauthenticatedView
      color={color}
      message="パイプラインデータの表示・管理にはログインが必要です。"
    />
  );
}
