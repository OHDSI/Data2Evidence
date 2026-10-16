import { useState, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { D2eTextField } from "./D2eTextField";

const meta = {
  title: "Inputs/D2eTextField",
  component: D2eTextField,
  args: { label: "Name", placeholder: "Type here" },
} satisfies Meta<typeof D2eTextField>;

export default meta;
type Story = StoryObj<typeof meta>;

function Field(props: React.ComponentProps<typeof D2eTextField>) {
  const [value, setValue] = useState(props.value ?? "");
  return <D2eTextField {...props} value={value} onChange={setValue} />;
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

// Consolidated reference (Figma field states). Hover/focus are interactive and
// can't be shown statically here.
export const Showcase: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <Row label="Default">
        <Field label="Label" />
      </Row>
      <Row label="Placeholder">
        <Field label="Label" placeholder="Placeholder" />
      </Row>
      <Row label="With value">
        <Field label="Label" value="Value" />
      </Row>
      <Row label="Required">
        <Field label="Label" required />
      </Row>
      <Row label="Error">
        <Field label="Label" value="Value" errorMessages="Helper text" />
      </Row>
      <Row label="Disabled">
        <Field label="Label" value="Value" disabled />
      </Row>
    </div>
  ),
};

export const Playground: Story = {
  decorators: [(StoryFn) => <div style={{ width: 320 }}>{StoryFn()}</div>],
  render: (args) => {
    const [value, setValue] = useState("");
    return <D2eTextField {...args} value={value} onChange={setValue} />;
  },
};
