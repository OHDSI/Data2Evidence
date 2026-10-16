import type { Meta, StoryObj } from "@storybook/react-vite";
import type { TooltipProps } from "@mui/material/Tooltip";
import { D2eTooltip } from "./D2eTooltip";
import { D2eButton } from "./D2eButton";

const meta = {
  title: "Data display/D2eTooltip",
  component: D2eTooltip,
  args: {
    title: "My Tooltip",
    placement: "top",
    arrow: true,
    children: <D2eButton variant="secondary">Hover me</D2eButton>,
  },
  argTypes: {
    placement: {
      control: "select",
      options: [
        "top",
        "bottom",
        "left",
        "right",
        "top-start",
        "top-end",
        "bottom-start",
        "bottom-end",
      ],
    },
    arrow: { control: "boolean" },
  },
} satisfies Meta<typeof D2eTooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

const PLACEMENTS: { label: string; placement: TooltipProps["placement"] }[] = [
  { label: "Up", placement: "top" },
  { label: "Down", placement: "bottom" },
  { label: "Left", placement: "left" },
  { label: "Right", placement: "right" },
  { label: "Up-left", placement: "top-start" },
  { label: "Up-right", placement: "top-end" },
];

// Consolidated reference (Figma Tooltips). Each placement is forced open in its own
// spacious cell (non-portalled) so the open tooltips have room and don't overlap.
export const Showcase: Story = {
  render: () => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 260px)",
        rowGap: 80,
        columnGap: 80,
        padding: "80px 40px",
      }}
    >
      {PLACEMENTS.map(({ label, placement }) => (
        <div
          key={label}
          style={{
            position: "relative",
            height: 120,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <D2eTooltip
            title="My Tooltip"
            placement={placement}
            arrow
            open
            disableHoverListener
            disableFocusListener
            disableTouchListener
            PopperProps={{ disablePortal: true }}
          >
            <D2eButton variant="secondary">{label}</D2eButton>
          </D2eTooltip>
        </div>
      ))}
    </div>
  ),
};

export const Playground: Story = {};
