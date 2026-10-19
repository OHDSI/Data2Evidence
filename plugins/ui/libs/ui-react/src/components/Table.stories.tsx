import { Fragment, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import Skeleton from "@mui/material/Skeleton";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableExpandableRow,
  TableSubRow,
} from "./Table";
import { Checkbox } from "./Checkbox";
import { StatusChip } from "./StatusChip";

const meta = {
  title: "Data display/Table",
  component: Table,
} satisfies Meta<typeof Table>;

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
// chip and a skeleton loading row — exercising TableRow/Cell states.
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
        <Table>
          <TableHead>
            <TableRow>
              <TableCell header checkbox />
              <TableCell
                header
                sortable
                sortDirection={dir}
                onSort={() => setDir((d) => (d === "asc" ? "desc" : "asc"))}
              >
                Name
              </TableCell>
              <TableCell header>Owner</TableCell>
              <TableCell header>Status</TableCell>
              <TableCell header numeric>
                People
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.id}
                hover
                selected={!!selected[row.id]}
                accent={!!selected[row.id]}
              >
                <TableCell checkbox>
                  <Checkbox
                    checked={!!selected[row.id]}
                    onChange={() => toggle(row.id)}
                    ariaLabel={`Select ${row.name}`}
                  />
                </TableCell>
                <TableCell>
                  <a href="#" style={{ color: "var(--d2e-color-primary)" }}>
                    {row.name}
                  </a>
                </TableCell>
                <TableCell>{row.owner}</TableCell>
                <TableCell>
                  <StatusChip variant={row.status} label={STATUS_LABEL[row.status]} />
                </TableCell>
                <TableCell numeric>{row.count.toLocaleString()}</TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell checkbox />
              {Array.from({ length: 4 }).map((_, i) => (
                <TableCell key={i}>
                  <Skeleton variant="text" width={120} />
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
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
        <Table>
          <TableHead>
            <TableRow>
              <TableCell header checkbox />
              <TableCell header>Name</TableCell>
              <TableCell header>Owner</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {GROUPS.map((group) => (
              <Fragment key={group.id}>
                <TableExpandableRow
                  hover
                  expanded={!!open[group.id]}
                  onToggle={(next) => setOpen((s) => ({ ...s, [group.id]: next }))}
                  expandLabel={`Toggle ${group.name}`}
                >
                  <TableCell>{group.name}</TableCell>
                  <TableCell>{group.owner}</TableCell>
                </TableExpandableRow>
                {open[group.id] && (
                  <>
                    <TableSubRow header>
                      <TableCell colSpan={3}>Cache data source</TableCell>
                    </TableSubRow>
                    {group.children.map((child, i) => (
                      <TableSubRow
                        key={child.name}
                        last={i === group.children.length - 1}
                      >
                        <TableCell>{child.name}</TableCell>
                        <TableCell>{child.owner}</TableCell>
                      </TableSubRow>
                    ))}
                  </>
                )}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  },
};

export const Playground: Story = {
  render: () => (
    <div style={{ maxWidth: 520 }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell header>Name</TableCell>
            <TableCell header numeric>
              People
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {ROWS.map((row) => (
            <TableRow key={row.id} hover>
              <TableCell>{row.name}</TableCell>
              <TableCell numeric>{row.count.toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  ),
};
