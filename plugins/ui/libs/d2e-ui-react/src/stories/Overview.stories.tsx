import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { D2eButton } from "../components/D2eButton";
import { D2eIconButton } from "../components/D2eIconButton";
import { D2eStatusChip } from "../components/D2eStatusChip";
import { D2eCheckbox } from "../components/D2eCheckbox";
import { D2eRadioGroup } from "../components/D2eRadio";
import { D2eSwitch } from "../components/D2eSwitch";
import { D2eSlider } from "../components/D2eSlider";
import { D2eTextField } from "../components/D2eTextField";
import { D2eSelect } from "../components/D2eSelect";
import { D2eDateField } from "../components/D2eDateField";
import { D2eTooltip } from "../components/D2eTooltip";
import { D2eTabs, D2eTab } from "../components/D2eTab";
import { D2eAlert } from "../components/D2eAlert";
import { D2eMenu } from "../components/D2eMenu";
import { D2eToolbar } from "../components/D2eToolbar";
import { D2eDialog } from "../components/D2eDialog";
import {
  D2eTable,
  D2eTableHead,
  D2eTableBody,
  D2eTableRow,
  D2eTableCell,
} from "../components/D2eTable";

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
          <D2eButton variant="primary">Primary</D2eButton>
          <D2eButton variant="secondary">Secondary</D2eButton>
          <D2eButton variant="danger">Danger</D2eButton>
        </Tile>

        <Tile name="Icon button">
          <D2eIconButton category="primary" ariaLabel="Notify"><NotificationsOutlinedIcon /></D2eIconButton>
          <D2eIconButton category="secondary" ariaLabel="Edit"><EditOutlinedIcon /></D2eIconButton>
          <D2eIconButton category="no-stroke" ariaLabel="Delete"><DeleteOutlineIcon /></D2eIconButton>
        </Tile>

        <Tile name="Status chip">
          <D2eStatusChip variant="positive" label="Ready" />
          <D2eStatusChip variant="warning" label="Pending" />
          <D2eStatusChip variant="negative" label="Failed" />
        </Tile>

        <Tile name="Checkbox · Radio · Switch">
          <D2eCheckbox label="Agree" checked={checked} onChange={setChecked} />
          <D2eRadioGroup
            row
            value={role}
            onChange={setRole}
            options={[
              { label: "A", value: "researcher" },
              { label: "B", value: "reviewer" },
            ]}
          />
          <D2eSwitch label="On" checked={on} onChange={setOn} />
        </Tile>

        <Tile name="Slider">
          <div style={{ width: "100%" }}>
            <D2eSlider defaultValue={40} valueLabelDisplay="auto" />
          </div>
        </Tile>

        <Tile name="Text field · Select · Date">
          <D2eTextField label="Name" />
          <D2eSelect label="Source" items={SELECT_ITEMS} value={sel} onChange={(v) => setSel(v as string)} />
          <D2eDateField label="Date" />
        </Tile>

        <Tile name="Tooltip">
          <D2eTooltip title="Helpful hint" open arrow PopperProps={{ disablePortal: true }}>
            <D2eButton variant="secondary">Hover</D2eButton>
          </D2eTooltip>
        </Tile>

        <Tile name="Tabs">
          <div style={{ width: "100%" }}>
            <D2eTabs value={tab} onChange={setTab}>
              <D2eTab label="Overview" />
              <D2eTab label="Details" />
              <D2eTab label="Activity" />
            </D2eTabs>
          </div>
        </Tile>

        <Tile name="Table">
          <div style={{ width: "100%" }}>
            <D2eTable>
              <D2eTableHead>
                <D2eTableRow>
                  <D2eTableCell header>Name</D2eTableCell>
                  <D2eTableCell header numeric>People</D2eTableCell>
                </D2eTableRow>
              </D2eTableHead>
              <D2eTableBody>
                <D2eTableRow hover>
                  <D2eTableCell>Diabetes cohort</D2eTableCell>
                  <D2eTableCell numeric>12,345</D2eTableCell>
                </D2eTableRow>
                <D2eTableRow hover selected accent>
                  <D2eTableCell>Hypertension</D2eTableCell>
                  <D2eTableCell numeric>873</D2eTableCell>
                </D2eTableRow>
              </D2eTableBody>
            </D2eTable>
          </div>
        </Tile>

        <Tile name="Alert">
          <div style={{ width: "100%" }}>
            <D2eAlert severity="success">Saved successfully.</D2eAlert>
          </div>
        </Tile>

        <Tile name="Menu">
          <D2eMenu
            width={220}
            items={[
              { label: "Rename", value: "rename" },
              { label: "Duplicate", value: "dup", selected: true },
              { label: "Delete", value: "del", danger: true },
            ]}
          />
        </Tile>

        <Tile name="Toolbar · Dialog">
          <D2eToolbar>
            <D2eIconButton category="no-stroke" ariaLabel="Edit"><EditOutlinedIcon /></D2eIconButton>
            <D2eIconButton category="no-stroke" ariaLabel="Delete"><DeleteOutlineIcon /></D2eIconButton>
          </D2eToolbar>
          <D2eButton variant="primary" onClick={() => setDialog(true)}>Open dialog</D2eButton>
          <D2eDialog
            open={dialog}
            title="Delete exploration"
            onClose={() => setDialog(false)}
            actions={
              <>
                <D2eButton variant="secondary" onClick={() => setDialog(false)}>Cancel</D2eButton>
                <D2eButton variant="danger" onClick={() => setDialog(false)}>Delete</D2eButton>
              </>
            }
          >
            <p>This action cannot be undone. Are you sure?</p>
          </D2eDialog>
        </Tile>
      </div>
    );
  },
};
