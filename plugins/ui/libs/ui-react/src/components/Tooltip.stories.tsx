import type { Meta, StoryObj } from "@storybook/react-vite";
import type { TooltipProps } from "@mui/material/Tooltip";
import { Tooltip } from "./Tooltip";
import { Button } from "./Button";

const meta = {
  title: "Data display/Tooltip",
  component: Tooltip,
  args: {
    title: "My Tooltip",
    placement: "top",
    arrow: true,
    children: <Button variant="secondary">Hover me</Button>,
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
} satisfies Meta<typeof Tooltip>;

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
          <Tooltip
            title="My Tooltip"
            placement={placement}
            arrow
            open
            disableHoverListener
            disableFocusListener
            disableTouchListener
            PopperProps={{ disablePortal: true }}
          >
            <Button variant="secondary">{label}</Button>
          </Tooltip>
        </div>
      ))}
    </div>
  ),
};

export const Playground: Story = {};
