import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { RadioGroup } from "./Radio";
import { RADIO_SIZE_MAP, type RadioSize } from "./radioSizes";

const SIZES = Object.keys(RADIO_SIZE_MAP) as RadioSize[];

const OPTIONS = [
  { label: "Researcher", value: "researcher" },
  { label: "Reviewer", value: "reviewer" },
  { label: "Admin (disabled)", value: "admin", disabled: true },
];

const meta = {
  title: "Inputs/Radio",
  component: RadioGroup,
  args: { options: OPTIONS, size: "sm" },
  argTypes: { size: { control: "inline-radio", options: SIZES } },
} satisfies Meta<typeof RadioGroup>;

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
            <RadioGroup size={size} options={OPTIONS} value={value} onChange={setValue} />
          </section>
        ))}
      </div>
    );
  },
};

export const Playground: Story = {
  render: (args) => {
    const [value, setValue] = useState("researcher");
    return <RadioGroup {...args} value={value} onChange={setValue} />;
  },
};
