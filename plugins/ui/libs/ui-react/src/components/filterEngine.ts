// Pure filter logic: no React, no DOM. Reused by useFilters (client mode) and
// callable directly for server-query building.
import type {
  FilterDef,
  FilterOption,
  FilterState,
  FilterValue,
} from "./filterTypes";

const asString = (value: unknown): string => (value == null ? "" : String(value));

const asNumber = (value: unknown): number | undefined => {
  if (typeof value === "number") return Number.isNaN(value) ? undefined : value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isNaN(n) ? undefined : n;
  }
  return undefined;
};

export function readField<Row>(def: FilterDef<Row>, row: Row): unknown {
  if (def.accessor) return def.accessor(row);
  return (row as Record<string, unknown>)?.[def.id];
}

/** Whether a value actually narrows anything. */
export function isActive(value: FilterValue | undefined): boolean {
  if (!value) return false;
  switch (value.op) {
    case "in":
      return value.values.length > 0;
    case "range":
      return value.min != null || value.max != null;
    case "dateRange":
      return Boolean(value.from) || Boolean(value.to);
    case "contains":
      return value.text.trim() !== "";
    case "bool":
      return value.value === true;
  }
}

/**
 * The button badge count: a multi-select contributes one per selected value,
 * every other active filter contributes one.
 */
export function activeFilterCount(state: FilterState): number {
  return Object.values(state).reduce((total, value) => {
    if (!isActive(value)) return total;
    return total + (value.op === "in" ? value.values.length : 1);
  }, 0);
}

export function matchesFilter<Row>(
  def: FilterDef<Row>,
  value: FilterValue,
  row: Row,
): boolean {
  const raw = readField(def, row);
  switch (value.op) {
    case "in":
      return value.values.includes(asString(raw));
    case "range": {
      const n = asNumber(raw);
      if (n == null) return false;
      if (value.min != null && n < value.min) return false;
      if (value.max != null && n > value.max) return false;
      return true;
    }
    case "dateRange": {
      // ISO YYYY-MM-DD sorts lexically, so string compares are date compares.
      const s = asString(raw);
      if (!s) return false;
      if (value.from && s < value.from) return false;
      if (value.to && s > value.to) return false;
      return true;
    }
    case "contains":
      return asString(raw).toLowerCase().includes(value.text.trim().toLowerCase());
    case "bool":
      return Boolean(raw) === value.value;
  }
}

/** AND across fields, OR within a multi-select. No-op when nothing is active. */
export function applyFilters<Row>(
  rows: readonly Row[],
  state: FilterState,
  defs: FilterDef<Row>[],
): Row[] {
  const defById = new Map(defs.map((def) => [def.id, def]));
  const active = Object.entries(state).filter(([, value]) => isActive(value));
  if (active.length === 0) return [...rows];
  return rows.filter((row) =>
    active.every(([id, value]) => {
      const def = defById.get(id);
      return def ? matchesFilter(def, value, row) : true;
    }),
  );
}

/**
 * The distinct, non-empty, sorted values a field holds across `rows`. Counts are
 * attached only when asked for (client mode omits them by default, matching the
 * portal DQD view; server facets supply their own).
 */
export function deriveOptions<Row>(
  def: FilterDef<Row>,
  rows: readonly Row[],
  opts: { withCounts?: boolean } = {},
): FilterOption[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const s = asString(readField(def, row));
    if (s === "") continue;
    counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([value, count]) =>
      opts.withCounts ? { value, label: value, count } : { value, label: value },
    );
}

const SELECT_KINDS = new Set(["multiSelect", "singleSelect"]);

/** Options for every select-type field: static items as given, else from rows. */
export function deriveAllOptions<Row>(
  defs: FilterDef<Row>[],
  rows: readonly Row[],
  opts: { withCounts?: boolean } = {},
): Record<string, FilterOption[]> {
  const out: Record<string, FilterOption[]> = {};
  for (const def of defs) {
    if (!SELECT_KINDS.has(def.control.kind)) continue;
    out[def.id] =
      def.options?.source === "static"
        ? def.options.items
        : deriveOptions(def, rows, opts);
  }
  return out;
}

/**
 * Serialize active filters to flat query params, mirroring the portal's
 * DatasetFilters shape: multi-select -> CSV on `id`; ranges/dates -> `id[gte]`
 * and `id[lte]`; text -> `id`; bool -> `id=true`. A def may override via
 * `serialize`.
 */
export function serializeFilters<Row>(
  state: FilterState,
  defs: FilterDef<Row>[],
): Record<string, string> {
  const defById = new Map(defs.map((def) => [def.id, def]));
  const out: Record<string, string> = {};
  for (const [id, value] of Object.entries(state)) {
    if (!isActive(value)) continue;
    const override = defById.get(id)?.serialize;
    if (override) {
      Object.assign(out, override(value));
      continue;
    }
    switch (value.op) {
      case "in":
        out[id] = value.values.join(",");
        break;
      case "range":
        if (value.min != null) out[`${id}[gte]`] = String(value.min);
        if (value.max != null) out[`${id}[lte]`] = String(value.max);
        break;
      case "dateRange":
        if (value.from) out[`${id}[gte]`] = value.from;
        if (value.to) out[`${id}[lte]`] = value.to;
        break;
      case "contains":
        out[id] = value.text.trim();
        break;
      case "bool":
        out[id] = "true";
        break;
    }
  }
  return out;
}
