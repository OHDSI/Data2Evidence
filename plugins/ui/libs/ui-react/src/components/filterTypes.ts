// Headless filter model shared by the FilterPanel and the useFilters hook.
// Framework- and product-neutral: an app supplies a FilterDef[] descriptor and
// (for client mode) its rows; the same descriptor drives rendering, option
// derivation, local filtering, and server-query serialization.
import type { Icon } from "./internal/icon";

/** One active filter, tagged by operator. Absent key / empty = inactive. */
export type FilterValue =
  | { op: "in"; values: string[] }
  | { op: "range"; min?: number; max?: number }
  | { op: "dateRange"; from?: string; to?: string }
  | { op: "contains"; text: string }
  | { op: "bool"; value: boolean };

/** field id -> its active value. */
export type FilterState = Record<string, FilterValue>;

/** A choice for a select-type filter. `count` is an optional facet count. */
export interface FilterOption {
  value: string;
  label: string;
  count?: number;
  disabled?: boolean;
}

/** The control a field renders as; the kind implies its default operator. */
export type FilterControl =
  | { kind: "multiSelect"; searchable?: boolean }
  | { kind: "singleSelect"; searchable?: boolean }
  | { kind: "numberRange"; min?: number; max?: number; step?: number }
  | { kind: "dateRange" }
  | { kind: "text" }
  | { kind: "bool" };

export type FilterControlKind = FilterControl["kind"];

/** Where a select field's options come from. */
export type FilterOptionsSource =
  | { source: "static"; items: FilterOption[] }
  | { source: "rows" }
  | { source: "async" };

/** The single source of truth for one filterable field. */
export interface FilterDef<Row = unknown> {
  /** Matches the row field and, by default, the server param name. */
  id: string;
  label: string;
  control: FilterControl;
  /** Leading glyph for select/text controls (e.g. "mdi-account"). */
  icon?: Icon;
  /** How to read this field off a row. Defaults to `row[id]`. */
  accessor?: (row: Row) => unknown;
  /** Select option source. Defaults to "rows" for select controls. */
  options?: FilterOptionsSource;
  /** Override the server serialization for this field. */
  serialize?: (value: FilterValue) => Record<string, string>;
}
