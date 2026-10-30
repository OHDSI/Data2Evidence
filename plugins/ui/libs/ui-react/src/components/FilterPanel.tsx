import { useMemo } from "react";
import FilterListIcon from "@mui/icons-material/FilterList";
import clsx from "clsx";
import { Button } from "./Button";
import { DateField } from "./DateField";
import { Menu, type MenuPlacement } from "./Menu";
import { Select } from "./Select";
import { Switch } from "./Switch";
import { TextField } from "./TextField";
import { activeFilterCount } from "./filterEngine";
import type {
  FilterControlKind,
  FilterDef,
  FilterOption,
  FilterState,
  FilterValue,
} from "./filterTypes";
import type { SelectItem } from "./selectSizes";
import "./FilterPanel.scss";

export interface FilterPanelProps {
  defs: FilterDef[];
  state: FilterState;
  /** Option lists per field id (row-derived or server facets). */
  options?: Record<string, FilterOption[]>;
  /** Emits the whole next state. */
  onChange: (state: FilterState) => void;
  filtersLabel?: string;
  clearLabel?: string;
  /** Placeholder for empty select/text fields. */
  anyLabel?: string;
  /** Corner the panel opens from (default "bottom-start"). */
  placement?: MenuPlacement;
  width?: number;
  className?: string;
}

const EMPTY: FilterOption[] = [];

// Date/number ranges show an uppercase group heading above a From/To row; selects
// and text put their label inside as a placeholder; a bool is a labelled switch.
const GROUPED: ReadonlySet<FilterControlKind> = new Set(["numberRange", "dateRange"]);

function toItems(options: FilterOption[]): SelectItem[] {
  return options.map((o) => ({
    value: o.value,
    label: o.count != null ? `${o.label} (${o.count})` : o.label,
    disabled: o.disabled,
  }));
}

const inValues = (value: FilterValue | undefined): string[] =>
  value?.op === "in" ? value.values : [];

export function FilterPanel({
  defs,
  state,
  options,
  onChange,
  filtersLabel = "Filters",
  clearLabel = "Clear all selections",
  anyLabel = "Any",
  placement = "bottom-start",
  width = 420,
  className,
}: FilterPanelProps) {
  const count = useMemo(() => activeFilterCount(state), [state]);

  const patch = (id: string, value: FilterValue | undefined) => {
    const next = { ...state };
    if (value === undefined) delete next[id];
    else next[id] = value;
    onChange(next);
  };

  const control = (def: FilterDef) => {
    const value = state[def.id];
    const opts = options?.[def.id] ?? EMPTY;

    switch (def.control.kind) {
      case "multiSelect":
        return (
          <Select
            size="sm"
            multiple
            searchable={def.control.searchable ?? true}
            prependIcon={def.icon}
            items={toItems(opts)}
            value={inValues(value)}
            placeholder={def.label}
            onChange={(v) =>
              patch(def.id, { op: "in", values: Array.isArray(v) ? v : v ? [v] : [] })
            }
          />
        );
      case "singleSelect":
        return (
          <Select
            size="sm"
            searchable={def.control.searchable ?? true}
            prependIcon={def.icon}
            items={toItems(opts)}
            value={inValues(value)[0] ?? null}
            placeholder={def.label}
            onChange={(v) =>
              patch(def.id, { op: "in", values: typeof v === "string" && v ? [v] : [] })
            }
          />
        );
      case "numberRange": {
        const range = value?.op === "range" ? value : undefined;
        const edit = (next: { min?: number; max?: number }) =>
          patch(def.id, { op: "range", min: range?.min, max: range?.max, ...next });
        const num = (s: string) => (s.trim() === "" ? undefined : Number(s));
        return (
          <div className="d2e-filter-panel__row">
            <TextField
              type="number"
              placeholder={String(def.control.min ?? "Min")}
              value={range?.min != null ? String(range.min) : ""}
              onChange={(s) => edit({ min: num(s) })}
            />
            <TextField
              type="number"
              placeholder={String(def.control.max ?? "Max")}
              value={range?.max != null ? String(range.max) : ""}
              onChange={(s) => edit({ max: num(s) })}
            />
          </div>
        );
      }
      case "dateRange": {
        const dr = value?.op === "dateRange" ? value : undefined;
        return (
          <div className="d2e-filter-panel__row">
            <DateField
              clearable
              prependIcon="mdi-calendar-today"
              placeholder="From"
              value={dr?.from ?? null}
              onChange={(d) => patch(def.id, { op: "dateRange", from: d ?? undefined, to: dr?.to })}
            />
            <DateField
              clearable
              prependIcon="mdi-calendar-today"
              placeholder="To"
              value={dr?.to ?? null}
              onChange={(d) => patch(def.id, { op: "dateRange", from: dr?.from, to: d ?? undefined })}
            />
          </div>
        );
      }
      case "text":
        return (
          <TextField
            placeholder={def.label}
            value={value?.op === "contains" ? value.text : ""}
            onChange={(s) => patch(def.id, { op: "contains", text: s })}
          />
        );
      case "bool":
        return (
          <Switch
            label={def.label}
            checked={value?.op === "bool" ? value.value : false}
            onChange={(checked) => patch(def.id, { op: "bool", value: checked })}
          />
        );
    }
  };

  return (
    <Menu
      items={[]}
      width={width}
      placement={placement}
      activator={({ open }) => (
        <Button
          variant="secondary"
          prependIcon={<FilterListIcon />}
          onClick={open}
          data-testid="d2e-filter-panel-trigger"
        >
          {filtersLabel}
          {count > 0 ? ` (${count})` : null}
        </Button>
      )}
    >
      <div
        className={clsx("d2e-filter-panel", className)}
        style={{ width }}
        data-testid="d2e-filter-panel"
      >
        <header className="d2e-filter-panel__header">
          <span className="d2e-filter-panel__title">{filtersLabel}</span>
          <Button variant="ghost" disabled={count === 0} onClick={() => onChange({})}>
            {clearLabel}
          </Button>
        </header>
        <div className="d2e-filter-panel__body">
          {defs.map((def) => (
            <div key={def.id} className="d2e-filter-panel__field">
              {GROUPED.has(def.control.kind) ? (
                <span className="d2e-filter-panel__group-label">{def.label}</span>
              ) : null}
              {control(def)}
            </div>
          ))}
        </div>
      </div>
    </Menu>
  );
}

export default FilterPanel;
