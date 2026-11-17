import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { FilterPanel } from "./FilterPanel";
import { useFilters } from "./useFilters";
import { serializeFilters } from "./filterEngine";
import type { FilterDef, FilterState } from "./filterTypes";

// A left-aligned column so the trigger button hugs its label instead of
// stretching to the container width.
function Stack({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 16, width: 560 }}>
      {children}
    </div>
  );
}

interface Exploration {
  author: string;
  status: string;
  created: string;
  updated: string;
  materialized: string;
  shared: boolean;
}

const rows: Exploration[] = [
  { author: "john.doe", status: "Ready", created: "2026-01-10", updated: "2026-05-18", materialized: "2026-05-19", shared: false },
  { author: "research123", status: "Stale", created: "2026-02-02", updated: "2026-05-14", materialized: "2026-05-14", shared: true },
  { author: "john.doe", status: "Ready", created: "2026-03-01", updated: "2026-04-21", materialized: "2026-04-22", shared: true },
  { author: "a.smith", status: "Running", created: "2026-04-15", updated: "2026-05-01", materialized: "", shared: false },
];

// Mirrors Figma 2697:211984 (Data exploration | Filter).
const defs: FilterDef<Exploration>[] = [
  { id: "author", label: "Author", control: { kind: "singleSelect" }, icon: "mdi-account" },
  { id: "status", label: "Materialization status", control: { kind: "multiSelect" }, icon: "mdi-check-circle-outline" },
  { id: "created", label: "Created", control: { kind: "dateRange" } },
  { id: "updated", label: "Last updated", control: { kind: "dateRange" } },
  { id: "materialized", label: "Last materialized", control: { kind: "dateRange" } },
  { id: "shared", label: "Show shared exploration", control: { kind: "bool" } },
];

const meta = {
  title: "Inputs/FilterPanel",
  component: FilterPanel,
  args: { defs, state: {}, onChange: () => {} },
} satisfies Meta<typeof FilterPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

// The Data-exploration filter, client mode: options derived from rows, filtering
// runs locally, the match count updates live.
export const Showcase: Story = {
  render: () => {
    const [state, setState] = useState<FilterState>({});
    const { options, result } = useFilters({ defs, rows, value: state, onChange: setState });
    return (
      <Stack>
        <FilterPanel defs={defs} state={state} options={options} onChange={setState} />
        <div style={{ font: "400 13px/1.5 var(--d2e-font-family)", color: "var(--d2e-color-neutral)" }}>
          {result?.length ?? rows.length} of {rows.length} explorations match
        </div>
      </Stack>
    );
  },
};

// Server mode: facet options are supplied (with counts), filtering is NOT local —
// the component owns state, which you serialize into a query.
export const ServerMode: Story = {
  render: () => {
    const serverDefs: FilterDef[] = [
      { id: "category", label: "Category", control: { kind: "multiSelect" } },
      { id: "severity", label: "Severity", control: { kind: "multiSelect" } },
      { id: "violated", label: "% violated rows", control: { kind: "numberRange", min: 0, max: 100 } },
    ];
    const [state, setState] = useState<FilterState>({});
    const options = {
      category: [
        { value: "Plausibility", label: "Plausibility", count: 120 },
        { value: "Conformance", label: "Conformance", count: 54 },
        { value: "Completeness", label: "Completeness", count: 18 },
      ],
      severity: [
        { value: "Fatal", label: "Fatal", count: 7 },
        { value: "Convention", label: "Convention", count: 140 },
      ],
    };
    return (
      <Stack>
        <FilterPanel defs={serverDefs} state={state} options={options} onChange={setState} />
        <pre style={{ font: "400 12px/1.5 monospace", color: "var(--d2e-color-neutral)" }}>
          query = {JSON.stringify(serializeFilters(state, serverDefs))}
        </pre>
      </Stack>
    );
  },
};

export const Playground: Story = {
  render: () => {
    const [state, setState] = useState<FilterState>({
      author: { op: "in", values: ["john.doe"] },
      shared: { op: "bool", value: true },
    });
    const { options } = useFilters({ defs, rows, value: state, onChange: setState });
    return (
      <Stack>
        <FilterPanel defs={defs} state={state} options={options} onChange={setState} />
      </Stack>
    );
  },
};
