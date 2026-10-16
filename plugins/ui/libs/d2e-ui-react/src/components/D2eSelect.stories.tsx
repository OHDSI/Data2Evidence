import { useState, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { D2eSelect } from "./D2eSelect";

const items = [
  { label: "Alpha", value: "a" },
  { label: "Beta", value: "b" },
  { label: "Gamma (disabled)", value: "c", disabled: true },
  { label: "Delta", value: "d" },
];

const meta = {
  title: "Inputs/D2eSelect",
  component: D2eSelect,
  args: { label: "Source", items },
} satisfies Meta<typeof D2eSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

function Sel(props: React.ComponentProps<typeof D2eSelect>) {
  const [value, setValue] = useState(
    props.value ?? (props.multiple ? [] : null),
  );
  return <D2eSelect {...props} value={value} onChange={setValue} />;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "110px minmax(0, 280px)",
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

// Consolidated reference (Figma selection states). Hover/focus are interactive
// and can't be shown statically here.
export const Showcase: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <Row label="Default">
        <Sel label="Source" items={items} value="a" />
      </Row>
      <Row label="Placeholder">
        <Sel label="Source" items={items} placeholder="Select…" />
      </Row>
      <Row label="Searchable">
        <Sel label="Source" items={items} searchable value="a" />
      </Row>
      <Row label="Multiple">
        <Sel label="Source" items={items} multiple value={["a", "d"]} />
      </Row>
      <Row label="With icon">
        <Sel label="Source" items={items} prependIcon="mdi-account" value="a" />
      </Row>
      <Row label="Error">
        <Sel label="Source" items={items} errorMessages="Required" />
      </Row>
      <Row label="Disabled">
        <Sel label="Source" items={items} disabled value="a" />
      </Row>
    </div>
  ),
};

export const Playground: Story = {
  decorators: [(StoryFn) => <div style={{ width: 320 }}>{StoryFn()}</div>],
  render: (args) => {
    const [value, setValue] = useState<string | string[] | null>("a");
    return <D2eSelect {...args} value={value} onChange={setValue} />;
  },
};
