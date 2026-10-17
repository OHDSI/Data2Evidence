import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { D2eSwitch } from "./D2eSwitch";
import { SWITCH_SIZE_MAP, type D2eSwitchSize } from "./switchSizes";

const SIZES = Object.keys(SWITCH_SIZE_MAP) as D2eSwitchSize[];

const meta = {
  title: "Inputs/D2eSwitch",
  component: D2eSwitch,
  args: { label: "Enabled", size: "md" },
  argTypes: { size: { control: "inline-radio", options: SIZES } },
} satisfies Meta<typeof D2eSwitch>;

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
            <D2eSwitch size={size} label="Off" />
            <D2eSwitch size={size} label="On" checked />
            <D2eSwitch size={size} label="Disabled" disabled />
            <D2eSwitch size={size} label="Disabled on" disabled checked />
          </div>
        </section>
      ))}
    </div>
  ),
};

export const Playground: Story = {
  render: (args) => {
    const [checked, setChecked] = useState(true);
    return <D2eSwitch {...args} checked={checked} onChange={setChecked} />;
  },
};
