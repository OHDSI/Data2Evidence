import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { D2eCheckbox } from "./D2eCheckbox";
import { CHECKBOX_SIZE_MAP, type D2eCheckboxSize } from "./checkboxSizes";

const SIZES = Object.keys(CHECKBOX_SIZE_MAP) as D2eCheckboxSize[];

const meta = {
  title: "Inputs/D2eCheckbox",
  component: D2eCheckbox,
  args: { label: "I agree", size: "sm" },
  argTypes: { size: { control: "inline-radio", options: SIZES } },
} satisfies Meta<typeof D2eCheckbox>;

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
            <D2eCheckbox size={size} label="Unchecked" />
            <D2eCheckbox size={size} label="Checked" checked />
            <D2eCheckbox size={size} label="Indeterminate" indeterminate />
            <D2eCheckbox size={size} label="Disabled" disabled />
            <D2eCheckbox size={size} label="Disabled checked" disabled checked />
          </div>
        </section>
      ))}
    </div>
  ),
};

export const Playground: Story = {
  render: (args) => {
    const [checked, setChecked] = useState(true);
    return <D2eCheckbox {...args} checked={checked} onChange={setChecked} />;
  },
};
