import React from "react";
import type { ColorsLight } from "../../../../src/theme";
import { SortControls as CommonSortControls } from "../../../../src/components/SortControls";

type SortField = "created_at" | "title";

type Props = {
  sortField: SortField;
  sortDirection: "asc" | "desc";
  onSort: (field: SortField) => void;
  color: typeof ColorsLight;
};

const SORT_OPTIONS: { field: SortField; label: string }[] = [
  { field: "created_at", label: "日付" },
  { field: "title", label: "タイトル" },
];

export function SortControls({ sortField, sortDirection, onSort, color }: Props) {
  return (
    <CommonSortControls
      options={SORT_OPTIONS}
      selectedField={sortField}
      onFieldChange={onSort}
      direction={sortDirection}
      color={color}
      layout="chip"
    />
  );
}
