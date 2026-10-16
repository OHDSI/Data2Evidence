import type { Meta, StoryObj } from "@storybook/react-vite";
import { D2eStatusChip } from "./D2eStatusChip";
import {
  STATUS_CHIP_VARIANT_MAP,
  type D2eStatusChipVariant,
} from "./statusChipVariants";

const VARIANTS = Object.keys(
  STATUS_CHIP_VARIANT_MAP,
) as D2eStatusChipVariant[];

const meta = {
  title: "Data display/D2eStatusChip",
  component: D2eStatusChip,
  args: { variant: "positive", label: "Ready" },
  argTypes: {
    variant: { control: "select", options: VARIANTS },
  },
} satisfies Meta<typeof D2eStatusChip>;

export default meta;
type Story = StoryObj<typeof meta>;

const heading = {
  margin: 0,
  font: "600 16px/1.2 var(--d2e-font-family)",
  color: "var(--d2e-color-primary)",
} as const;

// Consolidated reference (Figma CHIP). Each variant renders its default glyph;
// the multiselect/filter chip carries a trailing × (dismissible).
export const Showcase: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 style={heading}>Chip</h3>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          <D2eStatusChip variant="positive" label="Positive" />
          <D2eStatusChip variant="warning" label="Warning" />
          <D2eStatusChip variant="negative" label="Negative" />
          <D2eStatusChip variant="neutral" label="Neutral" />
          <D2eStatusChip variant="multiselect" label="Neutral" onDismiss={() => {}} />
        </div>
      </section>
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 style={heading}>Dataset status</h3>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          <D2eStatusChip variant="have-access" label="Have access" />
          <D2eStatusChip variant="pending-access" label="Pending access" />
          <D2eStatusChip variant="locked" label="Locked" />
        </div>
      </section>
    </div>
  ),
};

export const Playground: Story = {};
