import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import StorageOutlinedIcon from "@mui/icons-material/StorageOutlined";
import LogoutIcon from "@mui/icons-material/Logout";
import { Menu, type MenuItem } from "./Menu";
import { Button } from "./Button";

// "More actions" (⋮): edit group + a divider before the destructive action.
const moreActions: MenuItem[] = [
  { label: "Rename", value: "rename", icon: <EditOutlinedIcon /> },
  { label: "Duplicate", value: "dup", icon: <ContentCopyIcon /> },
  { label: "sep", value: "sep1", divider: true },
  { label: "Delete", value: "del", icon: <DeleteOutlineIcon />, danger: true },
];

// Navbar account menu — icons + a divider before "Sign out".
const account: MenuItem[] = [
  { label: "My account", value: "account", icon: <PersonOutlineIcon /> },
  { label: "Admin portal", value: "admin", icon: <AdminPanelSettingsOutlinedIcon /> },
  { label: "ETL portal", value: "etl", icon: <StorageOutlinedIcon /> },
  { label: "sep", value: "sep2", divider: true },
  { label: "Sign out", value: "signout", icon: <LogoutIcon /> },
];

// Split-button menu — text only, no icons.
const textOnly: MenuItem[] = [
  { label: "Download as CSV", value: "csv" },
  { label: "Download as SVG", value: "svg" },
  { label: "Download as PNG", value: "png" },
];

const statesMenu: MenuItem[] = [
  { label: "Rename", value: "rename", icon: <EditOutlinedIcon /> },
  { label: "Duplicate", value: "dup", selected: true },
  { label: "Delete", value: "del", icon: <DeleteOutlineIcon />, danger: true },
  { label: "Archived", value: "arc", disabled: true },
];

const meta = {
  title: "Feedback/Menu",
  component: Menu,
  args: { items: statesMenu, width: 260, onSelect: (v: string) => console.log("select", v) },
} satisfies Meta<typeof Menu>;

export default meta;
type Story = StoryObj<typeof meta>;

const heading = {
  margin: 0,
  textTransform: "uppercase",
  font: "600 13px/1.2 var(--d2e-font-family)",
  color: "var(--d2e-color-neutral)",
} as const;

function Col({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h3 style={heading}>{title}</h3>
      {children}
    </section>
  );
}

// Consolidated reference (Figma "Menu action"): action menus with icons, a
// divider grouping destructive/sign-out actions, a text-only variant, the
// selected / danger / disabled states, and the popover activator.
export const Showcase: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 40, alignItems: "flex-start", flexWrap: "wrap" }}>
      <Col title="More actions">
        <Menu items={moreActions} width={220} />
      </Col>
      <Col title="Account (navbar)">
        <Menu items={account} width={220} />
      </Col>
      <Col title="Split button · text only">
        <Menu items={textOnly} width={220} />
      </Col>
      <Col title="States">
        <Menu items={statesMenu} width={220} />
      </Col>
      <Col title="Popover">
        <Menu
          items={moreActions}
          width={220}
          activator={({ open }) => (
            <Button variant="secondary" onClick={open}>
              Open menu ▾
            </Button>
          )}
        />
      </Col>
    </div>
  ),
};

export const Playground: Story = {};
