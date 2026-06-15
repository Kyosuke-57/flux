import React from "react";
import type { SortField, SortDirection } from "../hooks/utils";
import type { ColorsLight } from "../../../../src/theme";
import { SortControls as CommonSortControls } from "../../../../src/components/SortControls";

type Props = {
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  color: typeof ColorsLight;
};

const sortOptions: { field: SortField; label: string }[] = [
  { field: "date", label: "日付" },
  { field: "name", label: "名前" },
  { field: "status", label: "ステータス" },
];

export function SortControls({ sortField, sortDirection, onSort, color }: Props) {
  return (
    <CommonSortControls
      options={sortOptions}
      selectedField={sortField}
      onFieldChange={onSort}
      direction={sortDirection}
      color={color as typeof ColorsLight}
      layout="chip-slim"
    />
  );
}
