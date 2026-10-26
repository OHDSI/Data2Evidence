import type { Meta, StoryObj } from "@storybook/react-vite";
import { Skeleton } from "./Skeleton";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "./Table";

const meta = {
  title: "Feedback/Skeleton",
  component: Skeleton,
  args: { variant: "rounded", width: 160, height: 12 },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

const heading = {
  margin: 0,
  font: "600 16px/1.2 var(--d2e-font-family)",
  color: "var(--d2e-color-primary)",
} as const;

const COLS = ["ID", "Code", "Name", "Domain", "Class"];

// Table loading: a 12px bar fills each cell (Figma "Table Loading").
function TableLoading() {
  return (
    <div style={{ maxWidth: 720 }}>
      <Table>
        <TableHead>
          <TableRow>
            {COLS.map((c) => (
              <TableCell key={c} header>
                {c}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {Array.from({ length: 6 }).map((_, r) => (
            <TableRow key={r}>
              {COLS.map((c) => (
                <TableCell key={c}>
                  <Skeleton height={12} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// Card loading: a title bar, body lines and a footer control.
function CardLoading() {
  return (
    <div
      style={{
        width: 280,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: 16,
        border: "1px solid var(--d2e-color-neutral-lighter)",
        borderRadius: 8,
      }}
    >
      <Skeleton variant="rounded" height={88} />
      <Skeleton width="60%" height={16} />
      <Skeleton width="90%" height={12} />
      <Skeleton width="80%" height={12} />
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <Skeleton variant="circular" width={32} height={32} />
        <Skeleton width={96} height={12} />
      </div>
    </div>
  );
}

export const Showcase: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 style={heading}>Shapes</h3>
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <Skeleton width={160} height={12} />
          <Skeleton variant="rectangular" width={120} height={64} />
          <Skeleton variant="circular" width={40} height={40} />
        </div>
      </section>
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 style={heading}>Table loading</h3>
        <TableLoading />
      </section>
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 style={heading}>Card loading</h3>
        <CardLoading />
      </section>
    </div>
  ),
};

export const Playground: Story = {};
