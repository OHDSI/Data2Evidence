import { useCallback, useMemo, useState } from "react";
import type {
  FilterDef,
  FilterOption,
  FilterState,
  FilterValue,
} from "./filterTypes";
import {
  activeFilterCount,
  applyFilters,
  deriveAllOptions,
  isActive,
} from "./filterEngine";

export interface UseFiltersArgs<Row> {
  defs: FilterDef<Row>[];
  /** Loaded rows. Needed for row-derived options and local filtering. */
  rows?: readonly Row[];
  /** Controlled state. Omit to let the hook own it. */
  value?: FilterState;
  /** Initial state when uncontrolled. */
  defaultValue?: FilterState;
  onChange?: (state: FilterState) => void;
  /**
   * Server-supplied facet options, keyed by field id. Merged over (and
   * overriding) any row-derived options — the seam for server mode.
   */
  options?: Record<string, FilterOption[]>;
  /** Attach counts to row-derived options. Default false. */
  withCounts?: boolean;
  /**
   * Run applyFilters locally. Defaults to true when `rows` is given. Set false
   * when the server already returns filtered rows.
   */
  filtersLocally?: boolean;
}

export interface UseFiltersResult<Row> {
  state: FilterState;
  setFilter: (id: string, value: FilterValue | undefined) => void;
  setState: (state: FilterState) => void;
  clear: () => void;
  activeCount: number;
  options: Record<string, FilterOption[]>;
  /** Filtered rows in client mode; undefined when filtering happens server-side. */
  result: Row[] | undefined;
}

/**
 * Headless controller for a filter set. Client mode (pass `rows`) derives
 * options and returns filtered `result`; server mode (pass `options`,
 * `filtersLocally: false`) just owns the state for you to serialize and query.
 */
export function useFilters<Row>(args: UseFiltersArgs<Row>): UseFiltersResult<Row> {
  const {
    defs,
    rows,
    value,
    defaultValue,
    onChange,
    options: optionOverride,
    withCounts = false,
    filtersLocally = rows != null,
  } = args;

  const [internal, setInternal] = useState<FilterState>(defaultValue ?? {});
  const controlled = value !== undefined;
  const state = controlled ? value : internal;

  const setState = useCallback(
    (next: FilterState) => {
      if (!controlled) setInternal(next);
      onChange?.(next);
    },
    [controlled, onChange],
  );

  const setFilter = useCallback(
    (id: string, next: FilterValue | undefined) => {
      const draft = { ...state };
      if (next === undefined || !isActive(next)) delete draft[id];
      else draft[id] = next;
      setState(draft);
    },
    [state, setState],
  );

  const clear = useCallback(() => setState({}), [setState]);

  const options = useMemo(() => {
    const derived = rows ? deriveAllOptions(defs, rows, { withCounts }) : {};
    return { ...derived, ...(optionOverride ?? {}) };
  }, [defs, rows, withCounts, optionOverride]);

  const result = useMemo(() => {
    if (!filtersLocally || !rows) return undefined;
    return applyFilters(rows, state, defs);
  }, [filtersLocally, rows, state, defs]);

  const activeCount = useMemo(() => activeFilterCount(state), [state]);

  return { state, setFilter, setState, clear, activeCount, options, result };
}
