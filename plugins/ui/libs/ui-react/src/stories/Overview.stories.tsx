import { useState, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";
import { Button } from "../components/Button";
import { IconButton } from "../components/IconButton";
import { StatusChip } from "../components/StatusChip";
import { Checkbox } from "../components/Checkbox";
import { RadioGroup } from "../components/Radio";
import { Switch } from "../components/Switch";
import { Slider } from "../components/Slider";
import { TextField } from "../components/TextField";
import { Select } from "../components/Select";
import { DateField } from "../components/DateField";
import { Tooltip } from "../components/Tooltip";
import { Tabs, Tab } from "../components/Tab";
import { Alert } from "../components/Alert";
import { Menu } from "../components/Menu";
import { Toolbar } from "../components/Toolbar";
import { Dialog } from "../components/Dialog";
import { PageHeader } from "../components/PageHeader";
import { Navbar, NavItem } from "../components/Navbar";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "../components/Table";

const meta = {
  title: "Foundations/Overview",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const tileTitle = {
  margin: "0 0 12px",
  font: "600 12px/1.2 var(--d2e-font-family)",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "var(--d2e-color-neutral)",
} as const;

function Tile({ name, children }: { name: string; children: ReactNode }) {
  return (
    <section
      style={{
        border: "1px solid var(--d2e-color-neutral-lighter)",
        borderRadius: 12,
        padding: 20,
        background: "var(--d2e-color-white)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <h3 style={tileTitle}>{name}</h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        {children}
      </div>
    </section>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h2
        style={{
          margin: 0,
          font: "300 20px/1.2 var(--d2e-font-family)",
          letterSpacing: "0.2px",
          color: "var(--d2e-color-primary)",
        }}
      >
        {title}
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 16,
        }}
      >
        {children}
      </div>
    </section>
  );
}

const SELECT_ITEMS = [
  { label: "Alpha", value: "a" },
  { label: "Beta", value: "b" },
];

export const Overview: Story = {
  render: () => {
    const [checked, setChecked] = useState(true);
    const [on, setOn] = useState(true);
    const [role, setRole] = useState("researcher");
    const [tab, setTab] = useState(0);
    const [sel, setSel] = useState<string | null>("a");
    const [dialog, setDialog] = useState(false);
    const [navItem, setNavItem] = useState("Overview");

    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--d2e-color-neutral-lightest)",
          fontFamily: "var(--d2e-font-family)",
        }}
      >
        <Navbar variant="next" end={<NavItem>john.doe_researcher</NavItem>}>
          {["Overview", "Components", "Tokens"].map((label) => (
            <NavItem
              key={label}
              selected={navItem === label}
              onClick={() => setNavItem(label)}
            >
              {label}
            </NavItem>
          ))}
        </Navbar>

        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 56px" }}>
          <PageHeader
            overline="Design system"
            title="Component overview"
            description="Every ui-react component at a glance — the React port of the D2E Design System."
            actions={
              <Button variant="primary" prependIcon={<AddIcon />}>
                New component
              </Button>
            }
          />

          <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
            <Group title="Inputs">
              <Tile name="Button">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="danger">Danger</Button>
              </Tile>

              <Tile name="Icon button">
                <IconButton category="primary" ariaLabel="Notify"><NotificationsOutlinedIcon /></IconButton>
                <IconButton category="secondary" ariaLabel="Edit"><EditOutlinedIcon /></IconButton>
                <IconButton category="no-stroke" ariaLabel="Delete"><DeleteOutlineIcon /></IconButton>
              </Tile>

              <Tile name="Checkbox · Radio · Switch">
                <Checkbox label="Agree" checked={checked} onChange={setChecked} />
                <RadioGroup
                  row
                  value={role}
                  onChange={setRole}
                  options={[
                    { label: "A", value: "researcher" },
                    { label: "B", value: "reviewer" },
                  ]}
                />
                <Switch label="On" checked={on} onChange={setOn} />
              </Tile>

              <Tile name="Slider">
                <div style={{ width: "100%" }}>
                  <Slider defaultValue={40} valueLabelDisplay="auto" />
                </div>
              </Tile>

              <Tile name="Text field · Select · Date">
                <TextField label="Name" />
                <Select label="Source" items={SELECT_ITEMS} value={sel} onChange={(v) => setSel(v as string)} />
                <DateField label="Date" />
              </Tile>

              <Tile name="Tabs">
                <div style={{ width: "100%" }}>
                  <Tabs value={tab} onChange={setTab}>
                    <Tab label="Overview" />
                    <Tab label="Details" />
                    <Tab label="Activity" />
                  </Tabs>
                </div>
              </Tile>
            </Group>

            <Group title="Data display">
              <Tile name="Status chip">
                <StatusChip variant="positive" label="Ready" />
                <StatusChip variant="warning" label="Pending" />
                <StatusChip variant="negative" label="Failed" />
              </Tile>

              <Tile name="Table">
                <div style={{ width: "100%" }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell header>Name</TableCell>
                        <TableCell header numeric>People</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow hover>
                        <TableCell>Diabetes cohort</TableCell>
                        <TableCell numeric>12,345</TableCell>
                      </TableRow>
                      <TableRow hover selected accent>
                        <TableCell>Hypertension</TableCell>
                        <TableCell numeric>873</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </Tile>

              <Tile name="Tooltip">
                <Tooltip title="Helpful hint" open arrow PopperProps={{ disablePortal: true }}>
                  <Button variant="secondary">Button</Button>
                </Tooltip>
              </Tile>

              <Tile name="Menu">
                <Menu
                  width={220}
                  items={[
                    { label: "Rename", value: "rename" },
                    { label: "Duplicate", value: "dup", selected: true },
                    { label: "Delete", value: "del", danger: true },
                  ]}
                />
              </Tile>
            </Group>

            <Group title="Feedback">
              <Tile name="Alert">
                <div style={{ width: "100%" }}>
                  <Alert severity="success">Saved successfully.</Alert>
                </div>
              </Tile>

              <Tile name="Dialog">
                <Button variant="primary" onClick={() => setDialog(true)}>Open dialog</Button>
                <Dialog
                  open={dialog}
                  title="Delete exploration"
                  onClose={() => setDialog(false)}
                  actions={
                    <>
                      <Button variant="secondary" onClick={() => setDialog(false)}>Cancel</Button>
                      <Button variant="danger" onClick={() => setDialog(false)}>Delete</Button>
                    </>
                  }
                >
                  <p>This action cannot be undone. Are you sure?</p>
                </Dialog>
              </Tile>
            </Group>

            <Group title="Layout">
              <Tile name="Toolbar">
                <Toolbar>
                  <IconButton category="no-stroke" ariaLabel="Edit"><EditOutlinedIcon /></IconButton>
                  <IconButton category="no-stroke" ariaLabel="Delete"><DeleteOutlineIcon /></IconButton>
                </Toolbar>
              </Tile>
            </Group>
          </div>
        </div>
      </div>
    );
  },
};
