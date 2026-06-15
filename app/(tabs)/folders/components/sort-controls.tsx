import React from "react";
import type { SortBy, SortOrder } from "../hooks/use-folders-data";
import type { ColorsLight } from "../../../../src/theme";
import { SortControls as CommonSortControls } from "../../../../src/components/SortControls";

type Props = {
  sortBy: SortBy;
  sortOrder: SortOrder;
  onChangeSortBy: (by: SortBy) => void;
  onToggleOrder: () => void;
  color: typeof ColorsLight;
};

const SORT_OPTIONS: { field: SortBy; label: string }[] = [
  { field: "date", label: "日付" },
  { field: "name", label: "名前" },
  { field: "status", label: "ステータス" },
];

export function SortControls({
  sortBy,
  sortOrder,
  onChangeSortBy,
  onToggleOrder,
  color,
}: Props) {
  return (
    <CommonSortControls
      options={SORT_OPTIONS}
      selectedField={sortBy}
      onFieldChange={onChangeSortBy}
      direction={sortOrder}
      onDirectionToggle={onToggleOrder}
      color={color}
      layout="pill"
    />
  );
}
