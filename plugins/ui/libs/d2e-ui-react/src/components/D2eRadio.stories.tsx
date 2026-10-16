import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { D2eRadioGroup } from "./D2eRadio";
import { RADIO_SIZE_MAP, type D2eRadioSize } from "./radioSizes";

const SIZES = Object.keys(RADIO_SIZE_MAP) as D2eRadioSize[];

const OPTIONS = [
  { label: "Researcher", value: "researcher" },
  { label: "Reviewer", value: "reviewer" },
  { label: "Admin (disabled)", value: "admin", disabled: true },
];

const meta = {
  title: "Inputs/D2eRadio",
  component: D2eRadioGroup,
  args: { options: OPTIONS, size: "sm" },
  argTypes: { size: { control: "inline-radio", options: SIZES } },
} satisfies Meta<typeof D2eRadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

const heading = {
  margin: 0,
  textTransform: "uppercase",
  font: "600 13px/1.2 var(--d2e-font-family)",
  color: "var(--d2e-color-neutral)",
} as const;

// Consolidated reference: each size, as a selectable group.
export const Showcase: Story = {
  render: () => {
    const [value, setValue] = useState("researcher");
    return (
      <div style={{ display: "flex", gap: 64 }}>
        {SIZES.map((size) => (
          <section key={size} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h3 style={heading}>{size}</h3>
            <D2eRadioGroup size={size} options={OPTIONS} value={value} onChange={setValue} />
          </section>
        ))}
      </div>
    );
  },
};

export const Playground: Story = {
  render: (args) => {
    const [value, setValue] = useState("researcher");
    return <D2eRadioGroup {...args} value={value} onChange={setValue} />;
  },
};
