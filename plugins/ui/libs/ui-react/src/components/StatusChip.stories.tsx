import type { Meta, StoryObj } from "@storybook/react-vite";
import { StatusChip } from "./StatusChip";
import {
  STATUS_CHIP_VARIANT_MAP,
  type StatusChipVariant,
} from "./statusChipVariants";

const VARIANTS = Object.keys(
  STATUS_CHIP_VARIANT_MAP,
) as StatusChipVariant[];

const meta = {
  title: "Data display/StatusChip",
  component: StatusChip,
  args: { variant: "positive", label: "Ready" },
  argTypes: {
    variant: { control: "select", options: VARIANTS },
  },
} satisfies Meta<typeof StatusChip>;

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
          <StatusChip variant="positive" label="Positive" />
          <StatusChip variant="warning" label="Warning" />
          <StatusChip variant="negative" label="Negative" />
          <StatusChip variant="neutral" label="Neutral" />
          <StatusChip variant="multiselect" label="Neutral" onDismiss={() => {}} />
        </div>
      </section>
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 style={heading}>Dataset status</h3>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          <StatusChip variant="have-access" label="Have access" />
          <StatusChip variant="pending-access" label="Pending access" />
          <StatusChip variant="locked" label="Locked" />
        </div>
      </section>
    </div>
  ),
};

export const Playground: Story = {};
