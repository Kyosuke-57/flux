import React from "react";
import type { SortField, SortDirection } from "../hooks/utils";
import type { ColorsLight } from "../../../../src/theme";
import { SortControls as CommonSortControls } from "../../../../src/components/SortControls";

type Props = {
  sortField: SortField;
  sortDirection: SortDirection;
  onToggle: (field: SortField) => void;
  color: typeof ColorsLight;
};

const SORT_OPTIONS: { field: SortField; label: string }[] = [
  { field: "date", label: "日付" },
  { field: "name", label: "名前" },
  { field: "status", label: "ステータス" },
];

export function SortControls({ sortField, sortDirection, onToggle, color }: Props) {
  return (
    <CommonSortControls
      options={SORT_OPTIONS}
      selectedField={sortField}
      onFieldChange={onToggle}
      direction={sortDirection}
      color={color}
      layout="chip-slim"
    />
  );
}
