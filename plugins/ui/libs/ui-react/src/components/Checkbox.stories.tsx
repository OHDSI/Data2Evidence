import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Checkbox } from "./Checkbox";
import { CHECKBOX_SIZE_MAP, type CheckboxSize } from "./checkboxSizes";

const SIZES = Object.keys(CHECKBOX_SIZE_MAP) as CheckboxSize[];

const meta = {
  title: "Inputs/Checkbox",
  component: Checkbox,
  args: { label: "I agree", size: "sm" },
  argTypes: { size: { control: "inline-radio", options: SIZES } },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

const heading = {
  margin: 0,
  textTransform: "uppercase",
  font: "600 13px/1.2 var(--d2e-font-family)",
  color: "var(--d2e-color-neutral)",
} as const;

// Consolidated reference: each size × state.
export const Showcase: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {SIZES.map((size) => (
        <section key={size} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h3 style={heading}>{size}</h3>
          <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
            <Checkbox size={size} label="Unchecked" />
            <Checkbox size={size} label="Checked" checked />
            <Checkbox size={size} label="Indeterminate" indeterminate />
            <Checkbox size={size} label="Disabled" disabled />
            <Checkbox size={size} label="Disabled checked" disabled checked />
          </div>
        </section>
      ))}
    </div>
  ),
};

export const Playground: Story = {
  render: (args) => {
    const [checked, setChecked] = useState(true);
    return <Checkbox {...args} checked={checked} onChange={setChecked} />;
  },
};
