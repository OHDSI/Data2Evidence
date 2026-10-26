// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { buildMuiTheme } from "../tokens/theme";
import { Button } from "../components/Button";
import { Chip } from "../components/Chip";
import { Spinner } from "../components/Spinner";
import { Skeleton } from "../components/Skeleton";
import { Pagination } from "../components/Pagination";
import { Dialog } from "../components/Dialog";
import { Menu } from "../components/Menu";
import { Select } from "../components/Select";
import { Tabs, Tab } from "../components/Tab";
import { Alert } from "../components/Alert";
import { Tooltip } from "../components/Tooltip";
import { Switch } from "../components/Switch";
import { RadioGroup } from "../components/Radio";
import { Slider } from "../components/Slider";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableExpandableRow,
  TableSubRow,
} from "../components/Table";

const theme = buildMuiTheme();

function mount(ui: React.ReactNode) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

afterEach(cleanup);

describe("render smoke", () => {
  it("renders a button and fires onClick", () => {
    let clicks = 0;
    mount(
      <Button variant="primary" onClick={() => (clicks += 1)}>
        Save
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Save" });
    fireEvent.click(button);
    expect(clicks).toBe(1);
  });

  it("renders a chip with its label", () => {
    mount(<Chip variant="positive" label="Ready" />);
    expect(screen.getByText("Ready")).toBeTruthy();
  });

  it("renders a spinner with an accessible status role", () => {
    mount(<Spinner label="Loading users" />);
    expect(screen.getByRole("status", { name: "Loading users" })).toBeTruthy();
  });

  it("renders a skeleton with the d2e class", () => {
    const { container } = mount(<Skeleton width={120} height={12} />);
    expect(container.querySelector(".d2e-skeleton")).toBeTruthy();
  });

  it("renders pagination with range and disables nav at bounds", () => {
    let page = 1;
    mount(
      <Pagination
        page={1}
        pageSize={10}
        totalCount={123}
        onPageChange={(p) => (page = p)}
        onPageSizeChange={() => {}}
      />,
    );
    expect(screen.getByText("1-10 of 123")).toBeTruthy();
    const first = screen.getByRole("button", { name: "First page" });
    expect(first).toHaveProperty("disabled", true);
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(page).toBe(2);
  });

  it("renders an open dialog with title, actions and busy lock", () => {
    let closed = 0;
    mount(
      <Dialog
        open
        title="Delete exploration"
        busy
        onClose={() => (closed += 1)}
        actions={<Button variant="danger">Delete</Button>}
      >
        <p>Body</p>
      </Dialog>,
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
      <Dialog
        open
        title="Edit permissions"
        confirmOnClose
        onClose={() => (closed += 1)}
      >
        <p>Body</p>
      </Dialog>,
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
      <Menu
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
      <Select
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
      <Tabs value={0} onChange={(v) => (selected = v)}>
        <Tab label="Concept Sets" />
        <Tab label="Search" />
        <Tab label="Import" disabled />
      </Tabs>,
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
      <Alert severity="error" title="Heads up" onClose={() => (closed += 1)}>
        Internal server error.
      </Alert>,
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
      <Tooltip title="My Tooltip" open arrow PopperProps={{ disablePortal: true }}>
        <button type="button">Target</button>
      </Tooltip>,
    );
    const tip = screen.getByRole("tooltip");
    expect(tip.querySelector(".d2e-tooltip")).toBeTruthy();
    expect(screen.getByText("My Tooltip")).toBeTruthy();
  });

  it("toggles a switch via onChange", () => {
    let value = false;
    mount(<Switch label="Enabled" checked={value} onChange={(v) => (value = v)} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Enabled" }));
    expect(value).toBe(true);
  });

  it("selects an option in a radio group", () => {
    let value = "a";
    mount(
      <RadioGroup
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
    mount(<Slider value={40} aria-label="Volume" />);
    const thumb = screen.getByRole("slider");
    expect(thumb.getAttribute("aria-valuenow")).toBe("40");
    expect(thumb.closest(".d2e-slider")).toBeTruthy();
  });

  it("renders a table with a sortable header and a selected/accent row", () => {
    let sorts = 0;
    mount(
      <Table>
        <TableHead>
          <TableRow>
            <TableCell header sortable sortDirection="asc" onSort={() => (sorts += 1)}>
              Name
            </TableCell>
            <TableCell header numeric>
              People
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow selected accent>
            <TableCell>Diabetes cohort</TableCell>
            <TableCell numeric>12,345</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
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
      <Table>
        <TableBody>
          <TableExpandableRow
            expanded={expanded}
            onToggle={() => (expanded = true)}
            expandLabel="Toggle group"
          >
            <TableCell>Oncology</TableCell>
          </TableExpandableRow>
        </TableBody>
      </Table>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Toggle group" }));
    expect(expanded).toBe(true);

    rerender(
      <ThemeProvider theme={theme}>
        <Table>
          <TableBody>
            <TableExpandableRow expanded expandLabel="Toggle group">
              <TableCell>Oncology</TableCell>
            </TableExpandableRow>
            <TableSubRow last>
              <TableCell>Breast cohort</TableCell>
            </TableSubRow>
          </TableBody>
        </Table>
      </ThemeProvider>,
    );
    const subCell = screen.getByText("Breast cohort").closest("tr");
    expect(subCell?.className).toContain("d2e-table__subrow");
    expect(subCell?.querySelector(".d2e-table__connector--last")).toBeTruthy();
  });
});
