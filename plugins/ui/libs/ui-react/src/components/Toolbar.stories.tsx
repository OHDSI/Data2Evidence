import type { Meta, StoryObj } from "@storybook/react-vite";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { Toolbar } from "./Toolbar";
import { IconButton } from "./IconButton";
import { Button } from "./Button";

const meta = {
  title: "Layout/Toolbar",
  component: Toolbar,
} satisfies Meta<typeof Toolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

const heading = {
  margin: 0,
  textTransform: "uppercase",
  font: "600 13px/1.2 var(--d2e-font-family)",
  color: "var(--d2e-color-neutral)",
} as const;

// Consolidated reference: icon-only, and icons + a text action.
export const Showcase: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 style={heading}>Icon actions</h3>
        <Toolbar>
          <IconButton category="no-stroke" ariaLabel="Edit"><EditOutlinedIcon /></IconButton>
          <IconButton category="no-stroke" ariaLabel="Delete"><DeleteOutlineIcon /></IconButton>
        </Toolbar>
      </section>
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 style={heading}>Icons + text action</h3>
        <Toolbar>
          <IconButton category="no-stroke" ariaLabel="Edit"><EditOutlinedIcon /></IconButton>
          <IconButton category="no-stroke" ariaLabel="Delete"><DeleteOutlineIcon /></IconButton>
          <Button variant="ghost">Export</Button>
        </Toolbar>
      </section>
    </div>
  ),
};

export const Playground: Story = {
  render: () => (
    <Toolbar>
      <IconButton category="no-stroke" ariaLabel="Edit"><EditOutlinedIcon /></IconButton>
      <IconButton category="no-stroke" ariaLabel="Delete"><DeleteOutlineIcon /></IconButton>
      <Button variant="ghost">Export</Button>
    </Toolbar>
  ),
};
