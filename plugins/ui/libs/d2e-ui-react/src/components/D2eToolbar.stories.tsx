import type { Meta, StoryObj } from "@storybook/react-vite";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { D2eToolbar } from "./D2eToolbar";
import { D2eIconButton } from "./D2eIconButton";
import { D2eButton } from "./D2eButton";

const meta = {
  title: "Layout/D2eToolbar",
  component: D2eToolbar,
} satisfies Meta<typeof D2eToolbar>;

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
        <D2eToolbar>
          <D2eIconButton category="no-stroke" ariaLabel="Edit"><EditOutlinedIcon /></D2eIconButton>
          <D2eIconButton category="no-stroke" ariaLabel="Delete"><DeleteOutlineIcon /></D2eIconButton>
        </D2eToolbar>
      </section>
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 style={heading}>Icons + text action</h3>
        <D2eToolbar>
          <D2eIconButton category="no-stroke" ariaLabel="Edit"><EditOutlinedIcon /></D2eIconButton>
          <D2eIconButton category="no-stroke" ariaLabel="Delete"><DeleteOutlineIcon /></D2eIconButton>
          <D2eButton variant="ghost">Export</D2eButton>
        </D2eToolbar>
      </section>
    </div>
  ),
};

export const Playground: Story = {
  render: () => (
    <D2eToolbar>
      <D2eIconButton category="no-stroke" ariaLabel="Edit"><EditOutlinedIcon /></D2eIconButton>
      <D2eIconButton category="no-stroke" ariaLabel="Delete"><DeleteOutlineIcon /></D2eIconButton>
      <D2eButton variant="ghost">Export</D2eButton>
    </D2eToolbar>
  ),
};
