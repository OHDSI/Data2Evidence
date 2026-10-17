// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { buildD2eMuiTheme } from "../tokens/theme";
import { D2eButton } from "../components/D2eButton";
import { D2eStatusChip } from "../components/D2eStatusChip";
import { D2eDialog } from "../components/D2eDialog";
import { D2eMenu } from "../components/D2eMenu";
import { D2eSelect } from "../components/D2eSelect";
import { D2eTabs, D2eTab } from "../components/D2eTab";
import { D2eAlert } from "../components/D2eAlert";
import { D2eTooltip } from "../components/D2eTooltip";
import { D2eSwitch } from "../components/D2eSwitch";
import { D2eRadioGroup } from "../components/D2eRadio";
import { D2eSlider } from "../components/D2eSlider";
import {
  D2eTable,
  D2eTableHead,
  D2eTableBody,
  D2eTableRow,
  D2eTableCell,
  D2eTableExpandableRow,
  D2eTableSubRow,
} from "../components/D2eTable";

const theme = buildD2eMuiTheme();

function mount(ui: React.ReactNode) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

afterEach(cleanup);

describe("render smoke", () => {
  it("renders a button and fires onClick", () => {
    let clicks = 0;
    mount(
      <D2eButton variant="primary" onClick={() => (clicks += 1)}>
        Save
      </D2eButton>,
    );
    const button = screen.getByRole("button", { name: "Save" });
    fireEvent.click(button);
    expect(clicks).toBe(1);
  });

  it("renders a status chip with its label", () => {
    mount(<D2eStatusChip variant="positive" label="Ready" />);
    expect(screen.getByText("Ready")).toBeTruthy();
  });

  it("renders an open dialog with title, actions and busy lock", () => {
    let closed = 0;
    mount(
      <D2eDialog
        open
        title="Delete exploration"
        busy
        onClose={() => (closed += 1)}
        actions={<D2eButton variant="danger">Delete</D2eButton>}
      >
        <p>Body</p>
      </D2eDialog>,
    );
    expect(screen.getByRole("heading", { name: "Delete exploration" })).toBeTruthy();
    // Busy must block the close button.
    const close = screen.getByRole("button", { name: "Close dialog" });
    fireEvent.click(close);
    expect(closed).toBe(0);
  });

  it("confirms before closing when confirmOnClose is set", () => {
    let closed = 0;
    mount(
      <D2eDialog
        open
        title="Edit permissions"
        confirmOnClose
        onClose={() => (closed += 1)}
      >
        <p>Body</p>
      </D2eDialog>,
    );
    // The × does not close directly; it opens the confirm-discard dialog.
    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    expect(closed).toBe(0);
    expect(screen.getByRole("heading", { name: "Discard changes?" })).toBeTruthy();
    // Keeping editing dismisses the confirm, still no close.
    fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(closed).toBe(0);
    // Re-open confirm and discard → onClose fires once.
    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    fireEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(closed).toBe(1);
  });

  it("renders the inline menu as a roving-tabindex list", () => {
    mount(
      <D2eMenu
        items={[
          { label: "Rename", value: "rename" },
          { label: "Delete", value: "delete", danger: true },
          { label: "Disabled", value: "x", disabled: true },
        ]}
      />,
    );
    const menu = screen.getByRole("menu");
    const items = screen.getAllByRole("menuitem");
    expect(menu).toBeTruthy();
    expect(items).toHaveLength(3);
    // Exactly one item is tabbable (tabindex 0); the rest are -1.
    const tabbable = items.filter((el) => el.getAttribute("tabindex") === "0");
    expect(tabbable).toHaveLength(1);
  });


  it("renders a select and opens its options", () => {
    mount(
      <D2eSelect
        label="Source"
        items={[
          { label: "Alpha", value: "a" },
          { label: "Beta", value: "b" },
        ]}
      />,
    );
    fireEvent.mouseDown(screen.getByRole("combobox"));
    expect(screen.getByRole("option", { name: "Alpha" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "Beta" })).toBeTruthy();
  });

  it("renders tabs, marks the selected one and fires onChange", () => {
    let selected = 0;
    mount(
      <D2eTabs value={0} onChange={(v) => (selected = v)}>
        <D2eTab label="Concept Sets" />
        <D2eTab label="Search" />
        <D2eTab label="Import" disabled />
      </D2eTabs>,
    );
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(3);
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");
    expect(tabs[2].className).toContain("Mui-disabled");
    fireEvent.click(tabs[1]);
    expect(selected).toBe(1);
  });

  it("renders an alert with title, message and a working close button", () => {
    let closed = 0;
    mount(
      <D2eAlert severity="error" title="Heads up" onClose={() => (closed += 1)}>
        Internal server error.
      </D2eAlert>,
    );
    const alert = screen.getByRole("alert");
    expect(alert.className).toContain("d2e-alert--error");
    expect(screen.getByText("Heads up")).toBeTruthy();
    expect(screen.getByText("Internal server error.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(closed).toBe(1);
  });

  it("renders a tooltip (open) with the D2E white surface class", () => {
    mount(
      <D2eTooltip title="My Tooltip" open arrow PopperProps={{ disablePortal: true }}>
        <button type="button">Target</button>
      </D2eTooltip>,
    );
    const tip = screen.getByRole("tooltip");
    expect(tip.querySelector(".d2e-tooltip")).toBeTruthy();
    expect(screen.getByText("My Tooltip")).toBeTruthy();
  });

  it("toggles a switch via onChange", () => {
    let value = false;
    mount(<D2eSwitch label="Enabled" checked={value} onChange={(v) => (value = v)} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Enabled" }));
    expect(value).toBe(true);
  });

  it("selects an option in a radio group", () => {
    let value = "a";
    mount(
      <D2eRadioGroup
        value={value}
        onChange={(v) => (value = v)}
        options={[
          { label: "Alpha", value: "a" },
          { label: "Beta", value: "b" },
        ]}
      />,
    );
    fireEvent.click(screen.getByRole("radio", { name: "Beta" }));
    expect(value).toBe("b");
  });

  it("renders a slider with the D2E class and a thumb at its value", () => {
    mount(<D2eSlider value={40} aria-label="Volume" />);
    const thumb = screen.getByRole("slider");
    expect(thumb.getAttribute("aria-valuenow")).toBe("40");
    expect(thumb.closest(".d2e-slider")).toBeTruthy();
  });

  it("renders a table with a sortable header and a selected/accent row", () => {
    let sorts = 0;
    mount(
      <D2eTable>
        <D2eTableHead>
          <D2eTableRow>
            <D2eTableCell header sortable sortDirection="asc" onSort={() => (sorts += 1)}>
              Name
            </D2eTableCell>
            <D2eTableCell header numeric>
              People
            </D2eTableCell>
          </D2eTableRow>
        </D2eTableHead>
        <D2eTableBody>
          <D2eTableRow selected accent>
            <D2eTableCell>Diabetes cohort</D2eTableCell>
            <D2eTableCell numeric>12,345</D2eTableCell>
          </D2eTableRow>
        </D2eTableBody>
      </D2eTable>,
    );
    expect(screen.getByRole("columnheader", { name: /Name/ }).getAttribute("aria-sort")).toBe(
      "ascending",
    );
    const row = screen.getByText("Diabetes cohort").closest("tr");
    expect(row?.className).toContain("d2e-table__row--accent");
    expect(row?.className).toContain("Mui-selected");
    fireEvent.click(screen.getByText("Name"));
    expect(sorts).toBe(1);
  });

  it("toggles an expandable row and renders sub-rows with a last connector", () => {
    let expanded = false;
    const { rerender } = mount(
      <D2eTable>
        <D2eTableBody>
          <D2eTableExpandableRow
            expanded={expanded}
            onToggle={() => (expanded = true)}
            expandLabel="Toggle group"
          >
            <D2eTableCell>Oncology</D2eTableCell>
          </D2eTableExpandableRow>
        </D2eTableBody>
      </D2eTable>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Toggle group" }));
    expect(expanded).toBe(true);

    rerender(
      <ThemeProvider theme={theme}>
        <D2eTable>
          <D2eTableBody>
            <D2eTableExpandableRow expanded expandLabel="Toggle group">
              <D2eTableCell>Oncology</D2eTableCell>
            </D2eTableExpandableRow>
            <D2eTableSubRow last>
              <D2eTableCell>Breast cohort</D2eTableCell>
            </D2eTableSubRow>
          </D2eTableBody>
        </D2eTable>
      </ThemeProvider>,
    );
    const subCell = screen.getByText("Breast cohort").closest("tr");
    expect(subCell?.className).toContain("d2e-table__subrow");
    expect(subCell?.querySelector(".d2e-table__connector--last")).toBeTruthy();
  });
});
