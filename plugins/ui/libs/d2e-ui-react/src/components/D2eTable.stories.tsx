import { Fragment, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import Skeleton from "@mui/material/Skeleton";
import {
  D2eTable,
  D2eTableHead,
  D2eTableBody,
  D2eTableRow,
  D2eTableCell,
  D2eTableExpandableRow,
  D2eTableSubRow,
} from "./D2eTable";
import { D2eCheckbox } from "./D2eCheckbox";
import { D2eStatusChip } from "./D2eStatusChip";

const meta = {
  title: "Data display/D2eTable",
  component: D2eTable,
} satisfies Meta<typeof D2eTable>;

export default meta;
type Story = StoryObj<typeof meta>;

interface Row {
  id: string;
  name: string;
  owner: string;
  status: "positive" | "warning" | "negative";
  count: number;
}

const ROWS: Row[] = [
  { id: "a", name: "Diabetes cohort", owner: "Ada", status: "positive", count: 12345 },
  { id: "b", name: "Hypertension study", owner: "Bo", status: "warning", count: 873 },
  { id: "c", name: "Survival analysis", owner: "Cy", status: "negative", count: 5420 },
];

const STATUS_LABEL: Record<Row["status"], string> = {
  positive: "Ready",
  warning: "Pending",
  negative: "Failed",
};

// Full table: sortable header, selectable checkbox column, hyperlink, number,
// chip and a skeleton loading row — exercising D2eTableRow/Cell states.
export const Showcase: Story = {
  render: () => {
    const [dir, setDir] = useState<"asc" | "desc">("asc");
    const [selected, setSelected] = useState<Record<string, boolean>>({ b: true });

    const rows = useMemo(
      () =>
        [...ROWS].sort((x, y) =>
          dir === "asc" ? x.name.localeCompare(y.name) : y.name.localeCompare(x.name),
        ),
      [dir],
    );

    const toggle = (id: string) =>
      setSelected((s) => ({ ...s, [id]: !s[id] }));

    return (
      <div style={{ maxWidth: 820 }}>
        <D2eTable>
          <D2eTableHead>
            <D2eTableRow>
              <D2eTableCell header checkbox />
              <D2eTableCell
                header
                sortable
                sortDirection={dir}
                onSort={() => setDir((d) => (d === "asc" ? "desc" : "asc"))}
              >
                Name
              </D2eTableCell>
              <D2eTableCell header>Owner</D2eTableCell>
              <D2eTableCell header>Status</D2eTableCell>
              <D2eTableCell header numeric>
                People
              </D2eTableCell>
            </D2eTableRow>
          </D2eTableHead>
          <D2eTableBody>
            {rows.map((row) => (
              <D2eTableRow
                key={row.id}
                hover
                selected={!!selected[row.id]}
                accent={!!selected[row.id]}
              >
                <D2eTableCell checkbox>
                  <D2eCheckbox
                    checked={!!selected[row.id]}
                    onChange={() => toggle(row.id)}
                    ariaLabel={`Select ${row.name}`}
                  />
                </D2eTableCell>
                <D2eTableCell>
                  <a href="#" style={{ color: "var(--d2e-color-primary)" }}>
                    {row.name}
                  </a>
                </D2eTableCell>
                <D2eTableCell>{row.owner}</D2eTableCell>
                <D2eTableCell>
                  <D2eStatusChip variant={row.status} label={STATUS_LABEL[row.status]} />
                </D2eTableCell>
                <D2eTableCell numeric>{row.count.toLocaleString()}</D2eTableCell>
              </D2eTableRow>
            ))}
            <D2eTableRow>
              <D2eTableCell checkbox />
              {Array.from({ length: 4 }).map((_, i) => (
                <D2eTableCell key={i}>
                  <Skeleton variant="text" width={120} />
                </D2eTableCell>
              ))}
            </D2eTableRow>
          </D2eTableBody>
        </D2eTable>
      </div>
    );
  },
};

interface Group {
  id: string;
  name: string;
  owner: string;
  children: { name: string; owner: string }[];
}

const GROUPS: Group[] = [
  {
    id: "g1",
    name: "Oncology program",
    owner: "Ada",
    children: [
      { name: "Breast cohort", owner: "Ada" },
      { name: "Lung cohort", owner: "Bo" },
      { name: "Skin cohort", owner: "Cy" },
    ],
  },
  {
    id: "g2",
    name: "Cardiology program",
    owner: "Di",
    children: [
      { name: "Hypertension cohort", owner: "Di" },
      { name: "Arrhythmia cohort", owner: "Eli" },
    ],
  },
];

// Expandable rows with the tree connector gutter. Toggle a parent to reveal its
// sub-rows; the last child's connector becomes an └.
export const Expandable: Story = {
  render: () => {
    const [open, setOpen] = useState<Record<string, boolean>>({ g1: true });
    return (
      <div style={{ maxWidth: 720 }}>
        <D2eTable>
          <D2eTableHead>
            <D2eTableRow>
              <D2eTableCell header checkbox />
              <D2eTableCell header>Name</D2eTableCell>
              <D2eTableCell header>Owner</D2eTableCell>
            </D2eTableRow>
          </D2eTableHead>
          <D2eTableBody>
            {GROUPS.map((group) => (
              <Fragment key={group.id}>
                <D2eTableExpandableRow
                  hover
                  expanded={!!open[group.id]}
                  onToggle={(next) => setOpen((s) => ({ ...s, [group.id]: next }))}
                  expandLabel={`Toggle ${group.name}`}
                >
                  <D2eTableCell>{group.name}</D2eTableCell>
                  <D2eTableCell>{group.owner}</D2eTableCell>
                </D2eTableExpandableRow>
                {open[group.id] && (
                  <>
                    <D2eTableSubRow header>
                      <D2eTableCell colSpan={2}>Cache data source</D2eTableCell>
                    </D2eTableSubRow>
                    {group.children.map((child, i) => (
                      <D2eTableSubRow
                        key={child.name}
                        last={i === group.children.length - 1}
                      >
                        <D2eTableCell>{child.name}</D2eTableCell>
                        <D2eTableCell>{child.owner}</D2eTableCell>
                      </D2eTableSubRow>
                    ))}
                  </>
                )}
              </Fragment>
            ))}
          </D2eTableBody>
        </D2eTable>
      </div>
    );
  },
};

export const Playground: Story = {
  render: () => (
    <div style={{ maxWidth: 520 }}>
      <D2eTable>
        <D2eTableHead>
          <D2eTableRow>
            <D2eTableCell header>Name</D2eTableCell>
            <D2eTableCell header numeric>
              People
            </D2eTableCell>
          </D2eTableRow>
        </D2eTableHead>
        <D2eTableBody>
          {ROWS.map((row) => (
            <D2eTableRow key={row.id} hover>
              <D2eTableCell>{row.name}</D2eTableCell>
              <D2eTableCell numeric>{row.count.toLocaleString()}</D2eTableCell>
            </D2eTableRow>
          ))}
        </D2eTableBody>
      </D2eTable>
    </div>
  ),
};
