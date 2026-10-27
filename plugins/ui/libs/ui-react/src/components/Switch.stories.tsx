import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Switch } from "./Switch";
import { SWITCH_SIZE_MAP, type SwitchSize } from "./switchSizes";

const SIZES = Object.keys(SWITCH_SIZE_MAP) as SwitchSize[];

const meta = {
  title: "Inputs/Switch",
  component: Switch,
  args: { label: "Enabled", size: "md" },
  argTypes: { size: { control: "inline-radio", options: SIZES } },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

const heading = {
  margin: 0,
  textTransform: "uppercase",
  font: "600 13px/1.2 var(--d2e-font-family)",
  color: "var(--d2e-color-neutral)",
} as const;

// Consolidated reference: each size × state (off / on / disabled).
export const Showcase: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {SIZES.map((size) => (
        <section key={size} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h3 style={heading}>{size}</h3>
          <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
            <Switch size={size} label="Off" />
            <Switch size={size} label="On" checked />
            <Switch size={size} label="Disabled" disabled />
            <Switch size={size} label="Disabled on" disabled checked />
          </div>
        </section>
      ))}
    </div>
  ),
};

export const Playground: Story = {
  render: (args) => {
    const [checked, setChecked] = useState(true);
    return <Switch {...args} checked={checked} onChange={setChecked} />;
  },
};
