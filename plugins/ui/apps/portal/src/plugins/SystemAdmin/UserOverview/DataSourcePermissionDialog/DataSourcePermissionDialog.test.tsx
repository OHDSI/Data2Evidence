import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DataSourcePermissionDialog } from "./DataSourcePermissionDialog";

const mockSetFeedback = jest.fn();
const mockApprove = jest.fn();
const mockReject = jest.fn();
const mockRevoke = jest.fn();

jest.mock("../../../../contexts", () => ({
  useFeedback: () => ({ setFeedback: mockSetFeedback }),
  useTranslation: () => ({
    getText: (key: string, params?: string[]) => (params ? `${key}:${params.join("|")}` : key),
    i18nKeys: new Proxy({}, { get: (_target, prop) => prop }),
  }),
}));

const pendingRow = {
  key: "pending-ds1-RESEARCHER",
  studyId: "ds1",
  tenantId: "t1",
  name: "Data source 1",
  role: "RESEARCHER",
  roleLabel: "Researcher",
  status: "pending",
  request: { id: "r1", userId: "u1", groupId: "g1" },
};
const accessRow = {
  key: "access-ds2-RESEARCHER",
  studyId: "ds2",
  tenantId: "t1",
  name: "Data source 2",
  role: "RESEARCHER",
  roleLabel: "Researcher",
  status: "access",
};
let mockRows: any[] = [];

jest.mock("./useUserDataSourcePermissions", () => ({
  useUserDataSourcePermissions: () => ({
    rows: mockRows,
    loading: false,
    error: false,
    assignableDatasets: [],
    approve: mockApprove,
    reject: mockReject,
    revoke: mockRevoke,
    add: jest.fn(),
  }),
}));

jest.mock("./AddDataSourceMenu", () => ({ AddDataSourceMenu: () => null }));

jest.mock(
  "ui-react",
  () => {
    const MockReact = require("react");
    const filterFns = { setState: jest.fn(), clear: jest.fn() };
    const passthrough = (tag: string) => (props: any) => MockReact.createElement(tag, null, props.children);
    return {
      Button: (props: any) =>
        MockReact.createElement("button", { onClick: props.onClick, disabled: props.disabled }, props.children),
      Chip: (props: any) => MockReact.createElement("span", null, props.label),
      Dialog: (props: any) =>
        props.open ? MockReact.createElement("div", null, props.title, props.children, props.actions) : null,
      EmptyState: (props: any) =>
        MockReact.createElement("div", null, MockReact.createElement("p", null, props.title), props.description),
      FilterPanel: () => null,
      Spinner: () => null,
      Table: passthrough("table"),
      TableHead: passthrough("thead"),
      TableBody: passthrough("tbody"),
      TableRow: passthrough("tr"),
      TableCell: passthrough("td"),
      TextField: () => null,
      useFilters: ({ rows }: any) => ({ state: {}, options: {}, ...filterFns, result: rows }),
    };
  },
  { virtual: true }
);

const user = { userId: "u1", username: "alice" } as any;

const renderDialog = () => render(<DataSourcePermissionDialog user={user} open onClose={jest.fn()} />);

beforeEach(() => {
  jest.clearAllMocks();
  mockRows = [pendingRow, accessRow];
});

test("shows the empty state when the user has no data source access", () => {
  mockRows = [];
  renderDialog();
  expect(screen.getByText("DATA_SOURCE_PERMISSION__EMPTY_TITLE")).toBeTruthy();
});

test("shows Approve/Reject for pending rows and Revoke for rows with access", () => {
  renderDialog();
  expect(screen.getByText("DATA_SOURCE_PERMISSION__APPROVE")).toBeTruthy();
  expect(screen.getByText("DATA_SOURCE_PERMISSION__REJECT")).toBeTruthy();
  expect(screen.getByText("DATA_SOURCE_PERMISSION__REVOKE")).toBeTruthy();
});

test("approves a pending request and shows the success toast", async () => {
  mockApprove.mockResolvedValue(undefined);
  renderDialog();
  fireEvent.click(screen.getByText("DATA_SOURCE_PERMISSION__APPROVE"));
  await waitFor(() => expect(mockApprove).toHaveBeenCalledWith(pendingRow));
  await waitFor(() =>
    expect(mockSetFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ type: "success", message: "DATA_SOURCE_PERMISSION__APPROVE_SUCCESS:alice" })
    )
  );
});

test("shows the error toast when approving fails", async () => {
  mockApprove.mockRejectedValue(new Error("boom"));
  renderDialog();
  fireEvent.click(screen.getByText("DATA_SOURCE_PERMISSION__APPROVE"));
  await waitFor(() =>
    expect(mockSetFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error", title: "DATA_SOURCE_PERMISSION__APPROVE_ERROR_TITLE" })
    )
  );
});

test("rejects only after the confirmation is accepted", async () => {
  mockReject.mockResolvedValue(undefined);
  renderDialog();
  fireEvent.click(screen.getByText("DATA_SOURCE_PERMISSION__REJECT"));
  expect(mockReject).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText("DATA_SOURCE_PERMISSION__CONFIRM"));
  await waitFor(() => expect(mockReject).toHaveBeenCalledWith(pendingRow));
  await waitFor(() =>
    expect(mockSetFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ type: "success", message: "DATA_SOURCE_PERMISSION__REJECT_SUCCESS:alice" })
    )
  );
});

test("cancelling the revoke confirmation does not revoke", () => {
  renderDialog();
  fireEvent.click(screen.getByText("DATA_SOURCE_PERMISSION__REVOKE"));
  fireEvent.click(screen.getByText("DATA_SOURCE_PERMISSION__CANCEL"));
  expect(mockRevoke).not.toHaveBeenCalled();
  expect(screen.queryByText("DATA_SOURCE_PERMISSION__REVOKE_CONFIRM")).toBeNull();
});
