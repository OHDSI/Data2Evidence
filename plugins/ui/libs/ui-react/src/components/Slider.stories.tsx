import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Slider } from "./Slider";

const meta = {
  title: "Inputs/Slider",
  component: Slider,
  args: { size: "md" },
  argTypes: { size: { control: "inline-radio", options: ["sm", "md"] } },
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

const heading = {
  margin: 0,
  textTransform: "uppercase",
  font: "600 13px/1.2 var(--d2e-font-family)",
  color: "var(--d2e-color-neutral)",
} as const;

const marks = [
  { value: 0, label: "0" },
  { value: 25, label: "25" },
  { value: 50, label: "50" },
  { value: 75, label: "75" },
  { value: 100, label: "100" },
];

// Consolidated reference: variants (continuous / marks / range / disabled) per
// size, plus a vertical slider.
export const Showcase: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 28, maxWidth: 360 }}>
      {(["md", "sm"] as const).map((size) => (
        <section key={size} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h3 style={heading}>{size}</h3>
          <Slider size={size} defaultValue={40} valueLabelDisplay="auto" />
          <Slider size={size} defaultValue={50} step={25} marks={marks} />
          <Slider size={size} defaultValue={[20, 60]} valueLabelDisplay="auto" />
          <Slider size={size} defaultValue={40} disabled />
        </section>
      ))}
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 style={heading}>Vertical</h3>
        <div style={{ height: 180, display: "flex", gap: 32 }}>
          <Slider orientation="vertical" defaultValue={40} valueLabelDisplay="auto" />
          <Slider orientation="vertical" defaultValue={[20, 70]} />
        </div>
      </section>
    </div>
  ),
};

export const Playground: Story = {
  render: (args) => {
    const [value, setValue] = useState<number>(40);
    return (
      <div style={{ maxWidth: 360 }}>
        <Slider
          {...args}
          value={value}
          valueLabelDisplay="auto"
          onChange={(_event, next) => setValue(next as number)}
        />
      </div>
    );
  },
};
