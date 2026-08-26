import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import EditTenantRoleDialog from "./EditTenantRoleDialog";

const mockSetUserGroup = jest.fn();

jest.mock("../../../../contexts", () => ({
  useTranslation: () => ({
    getText: (key: string, params?: string[]) => (params ? `${key}:${params.join("|")}` : key),
    i18nKeys: new Proxy({}, { get: (_target, prop) => prop }),
  }),
  // Editing a different user than the logged-in admin, so updateCurrentUserGroups is skipped.
  useUser: () => ({ user: { isUserAdmin: true, userId: "admin1" }, setUserGroup: mockSetUserGroup }),
}));

jest.mock("../../../../axios/api", () => ({
  api: {
    userMgmt: {
      registerTenantRoles: jest.fn(),
      withdrawTenantRoles: jest.fn(),
      registerAlpDataAdminRoles: jest.fn(),
      withdrawAlpDataAdminRoles: jest.fn(),
      registerAlpUserRoles: jest.fn(),
      withdrawAlpUserRoles: jest.fn(),
      getUserGroupList: jest.fn(),
    },
  },
}));

jest.mock(
  "@portal/components",
  () => {
    const MockReact = require("react");
    return {
      Button: (props: any) =>
        MockReact.createElement(
          "button",
          { onClick: props.onClick, disabled: props.disabled || props.loading },
          props.text
        ),
      // Surface `open`, `feedback`, and children so tests can assert the in-dialog banner.
      Dialog: (props: any) =>
        props.open
          ? MockReact.createElement(
              "div",
              null,
              props.feedback?.message &&
                MockReact.createElement(
                  "div",
                  { "data-testid": "feedback", "data-type": props.feedback.type },
                  props.feedback.message
                ),
              props.children
            )
          : null,
      Checkbox: (props: any) =>
        MockReact.createElement("input", {
          type: "checkbox",
          "aria-label": props.label,
          checked: !!props.checked,
          onChange: props.onChange,
        }),
    };
    // virtual: the package's dist build may not exist in the test environment
  },
  { virtual: true }
);

const { api } = jest.requireMock("../../../../axios/api");

const user = { userId: "u1", username: "alice", tenantId: "t1", system: "sys", roles: [] as string[] };

const UPDATE = "EDIT_TENANT_ROLE_DIALOG__UPDATE";

const renderDialog = () => {
  const onClose = jest.fn();
  render(<EditTenantRoleDialog user={user as any} dataAdminUserRoles={[]} alpUserRoles={[]} open onClose={onClose} />);
  return onClose;
};

beforeEach(() => {
  jest.clearAllMocks();
});

test("Outcome 1 — clicking Update with no changes keeps the dialog open and shows an info banner", async () => {
  const onClose = renderDialog();

  fireEvent.click(screen.getByText(UPDATE));

  const banner = await screen.findByTestId("feedback");
  expect(banner).toHaveTextContent("EDIT_TENANT_ROLE_DIALOG__NO_CHANGES");
  // No explicit type -> the Dialog/Alert renders it with the default "info" severity.
  expect(banner).not.toHaveAttribute("data-type");
  expect(onClose).not.toHaveBeenCalled();
  expect(api.userMgmt.registerTenantRoles).not.toHaveBeenCalled();
});

test("Outcome 2 — a successful role change closes the dialog via onClose('success')", async () => {
  api.userMgmt.registerTenantRoles.mockResolvedValue(undefined);
  const onClose = renderDialog();

  fireEvent.click(screen.getByLabelText("Viewer")); // grant the tenant Viewer role -> a real change
  fireEvent.click(screen.getByText(UPDATE));

  await waitFor(() => expect(onClose).toHaveBeenCalledWith("success"));
  expect(api.userMgmt.registerTenantRoles).toHaveBeenCalledTimes(1);
});

test("Outcome 3 — a failed update keeps the dialog open, shows an error banner, and preserves the selection", async () => {
  api.userMgmt.registerTenantRoles.mockRejectedValue(new Error("boom"));
  const onClose = renderDialog();

  fireEvent.click(screen.getByLabelText("Viewer")); // grant the tenant Viewer role
  fireEvent.click(screen.getByText(UPDATE));

  const banner = await screen.findByTestId("feedback");
  expect(banner).toHaveTextContent("EDIT_TENANT_ROLE_DIALOG__ERROR");
  expect(banner).toHaveAttribute("data-type", "error");
  expect(onClose).not.toHaveBeenCalled();
  // The admin's selection remains so they can retry.
  expect(screen.getByLabelText("Viewer")).toBeChecked();
});

test("editing a role clears a lingering 'no changes' banner", async () => {
  renderDialog();

  // Trigger the info banner first.
  fireEvent.click(screen.getByText(UPDATE));
  expect(await screen.findByTestId("feedback")).toBeInTheDocument();

  // Toggling a checkbox should clear the banner.
  fireEvent.click(screen.getByLabelText("Viewer"));
  await waitFor(() => expect(screen.queryByTestId("feedback")).not.toBeInTheDocument());
});
