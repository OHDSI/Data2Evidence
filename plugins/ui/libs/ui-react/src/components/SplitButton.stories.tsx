import { useState, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import { SplitButton } from "./SplitButton";
import type { ButtonSize } from "./buttonVariants";

const meta = {
  title: "Inputs/SplitButton",
  component: SplitButton,
  args: { children: "Label", variant: "primary", size: "md" },
  argTypes: {
    variant: { control: "inline-radio", options: ["primary", "secondary"] },
    size: { control: "inline-radio", options: ["xs", "sm", "md", "lg"] },
  },
} satisfies Meta<typeof SplitButton>;

export default meta;
type Story = StoryObj<typeof meta>;

const SIZES: ButtonSize[] = ["xs", "sm", "md", "lg"];

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center", gap: 16 }}>
      <span style={{ font: "400 13px/1.4 var(--d2e-font-family)", color: "var(--d2e-color-neutral)" }}>
        {label}
      </span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
        {children}
      </div>
    </div>
  );
}

// Consolidated reference (Figma "Split button"): Button + 1px divider + square
// chevron. Primary/Secondary, four sizes, icon front/back, and states.
export const Showcase: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Row label="Primary · sizes">
        {SIZES.map((size) => (
          <SplitButton key={size} size={size} variant="primary">
            Label
          </SplitButton>
        ))}
      </Row>
      <Row label="Secondary · sizes">
        {SIZES.map((size) => (
          <SplitButton key={size} size={size} variant="secondary">
            Label
          </SplitButton>
        ))}
      </Row>
      <Row label="Icon front / back">
        <SplitButton prependIcon={<SaveOutlinedIcon />}>Label</SplitButton>
        <SplitButton appendIcon={<SaveOutlinedIcon />}>Label</SplitButton>
        <SplitButton variant="secondary" prependIcon={<SaveOutlinedIcon />}>Label</SplitButton>
      </Row>
      <Row label="Open (menu shown)">
        <SplitButton open>Label</SplitButton>
        <SplitButton variant="secondary" open>Label</SplitButton>
      </Row>
      <Row label="Disabled">
        <SplitButton disabled>Label</SplitButton>
        <SplitButton variant="secondary" disabled>Label</SplitButton>
      </Row>
    </div>
  ),
};

export const Playground: Story = {
  render: (args) => {
    const [open, setOpen] = useState(false);
    return (
      <SplitButton
        {...args}
        open={open}
        onClick={() => {}}
        onToggle={() => setOpen((o) => !o)}
      />
    );
  },
};
