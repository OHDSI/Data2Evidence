import { useState, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { DateField } from "./DateField";

const meta = {
  title: "Inputs/DateField",
  component: DateField,
  args: { label: "Label" },
} satisfies Meta<typeof DateField>;

export default meta;
type Story = StoryObj<typeof meta>;

function DateCell(props: React.ComponentProps<typeof DateField>) {
  const [value, setValue] = useState<string | null>(props.value ?? null);
  return <DateField {...props} value={value} onChange={setValue} />;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "140px minmax(0, 260px)",
        alignItems: "center",
        gap: 16,
      }}
    >
      <span
        style={{
          font: "400 14px/1.5 var(--d2e-font-family)",
          color: "var(--d2e-color-neutral)",
        }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

// Consolidated reference (Figma DATE INPUT states). Hover/focus are interactive
// and can't be shown statically here.
export const Showcase: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <Row label="Enabled / value">
        <DateCell label="Label" value="2026-10-12" />
      </Row>
      <Row label="Enabled / empty">
        <DateCell label="Label" />
      </Row>
      <Row label="Clearable">
        <DateCell label="Label" value="2026-10-12" clearable />
      </Row>
      <Row label="Error">
        <DateCell label="Label" value="2026-10-12" errorMessages="Required" />
      </Row>
      <Row label="Disabled">
        <DateCell label="Label" value="2026-10-12" disabled />
      </Row>
    </div>
  ),
};

export const Playground: Story = {
  decorators: [(StoryFn) => <div style={{ width: 260 }}>{StoryFn()}</div>],
  render: (args) => {
    const [value, setValue] = useState<string | null>("2026-10-12");
    return <DateField {...args} value={value} onChange={setValue} />;
  },
};
