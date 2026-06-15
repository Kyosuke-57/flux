import React from "react";
import type { ColorsLight } from "../../../../src/theme";
import { SortControls as CommonSortControls } from "../../../../src/components/SortControls";

export type SortBy = "date" | "name" | "status";
export type SortOrder = "asc" | "desc";

type Props = {
  sortBy: SortBy;
  sortOrder: SortOrder;
  onSortByChange: (by: SortBy) => void;
  onSortOrderToggle: () => void;
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
  onSortByChange,
  onSortOrderToggle,
  color,
}: Props) {
  return (
    <CommonSortControls
      options={SORT_OPTIONS}
      selectedField={sortBy}
      onFieldChange={onSortByChange}
      direction={sortOrder}
      onDirectionToggle={onSortOrderToggle}
      color={color}
      layout="pill"
    />
  );
}
