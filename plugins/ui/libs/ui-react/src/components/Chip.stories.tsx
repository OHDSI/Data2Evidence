import type { Meta, StoryObj } from "@storybook/react-vite";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ScheduleIcon from "@mui/icons-material/Schedule";
import LockIcon from "@mui/icons-material/Lock";
import { Chip } from "./Chip";
import { CHIP_VARIANT_MAP, type ChipVariant } from "./chipVariants";

const VARIANTS = Object.keys(CHIP_VARIANT_MAP) as ChipVariant[];

const meta = {
  title: "Data display/Chip",
  component: Chip,
  args: { variant: "positive", label: "Ready" },
  argTypes: {
    variant: { control: "select", options: VARIANTS },
  },
} satisfies Meta<typeof Chip>;

export default meta;
type Story = StoryObj<typeof meta>;

const heading = {
  margin: 0,
  font: "600 16px/1.2 var(--d2e-font-family)",
  color: "var(--d2e-color-primary)",
} as const;

// Consolidated reference (Figma CHIP). Icons are supplied per instance — the
// component bakes in no default glyph. The multiselect/filter chip carries a
// trailing × (dismissible).
export const Showcase: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 style={heading}>Chip</h3>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          <Chip variant="positive" label="Positive" icon={<CheckCircleOutlineIcon />} />
          <Chip variant="warning" label="Warning" icon={<ScheduleIcon />} />
          <Chip variant="negative" label="Negative" icon={<LockIcon />} />
          <Chip variant="neutral" label="Neutral" icon={<LockIcon />} />
          <Chip variant="multiselect" label="Neutral" onDismiss={() => {}} />
        </div>
      </section>
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 style={heading}>Dataset status</h3>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          <Chip variant="have-access" label="Have access" icon={<CheckCircleOutlineIcon />} />
          <Chip variant="pending-access" label="Pending access" icon={<ScheduleIcon />} />
          <Chip variant="locked" label="Locked" icon={<LockIcon />} />
        </div>
      </section>
    </div>
  ),
};

export const Playground: Story = {};
