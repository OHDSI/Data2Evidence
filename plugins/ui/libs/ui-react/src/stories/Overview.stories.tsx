import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
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
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "../components/Table";

const meta = {
  title: "Foundations/Overview",
} satisfies Meta;

export default meta;
type Story = StoryObj;

const tileTitle = {
  margin: "0 0 12px",
  font: "600 13px/1.2 var(--d2e-font-family)",
  textTransform: "uppercase",
  color: "var(--d2e-color-neutral)",
} as const;

function Tile({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        border: "1px solid var(--d2e-color-neutral-lighter)",
        borderRadius: 8,
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

    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: 16,
          maxWidth: 1100,
          fontFamily: "var(--d2e-font-family)",
        }}
      >
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

        <Tile name="Status chip">
          <StatusChip variant="positive" label="Ready" />
          <StatusChip variant="warning" label="Pending" />
          <StatusChip variant="negative" label="Failed" />
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

        <Tile name="Tooltip">
          <Tooltip title="Helpful hint" open arrow PopperProps={{ disablePortal: true }}>
            <Button variant="secondary">Hover</Button>
          </Tooltip>
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

        <Tile name="Alert">
          <div style={{ width: "100%" }}>
            <Alert severity="success">Saved successfully.</Alert>
          </div>
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

        <Tile name="Toolbar · Dialog">
          <Toolbar>
            <IconButton category="no-stroke" ariaLabel="Edit"><EditOutlinedIcon /></IconButton>
            <IconButton category="no-stroke" ariaLabel="Delete"><DeleteOutlineIcon /></IconButton>
          </Toolbar>
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
      </div>
    );
  },
};
