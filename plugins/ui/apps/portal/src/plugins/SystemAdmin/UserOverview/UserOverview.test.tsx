import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { UserOverview } from "./UserOverview";

const mockSetFeedback = jest.fn();
const mockSetGenericErrorFeedback = jest.fn();

jest.mock("../../../env", () => ({}));

jest.mock("../../../axios/api", () => ({
  api: {
    userMgmt: {
      getUsersWithRoles: jest
        .fn()
        .mockResolvedValue([{ userId: "u1", username: "alice@example.com", tenantId: "t1", roles: [], active: true }]),
    },
  },
}));

const mockTenantsResult = [[{ id: "t1", name: "Tenant 1", system: "Local" }]];

jest.mock("../../../hooks", () => {
  const { useState } = require("react");
  return {
    useTenants: () => mockTenantsResult,
    useGroupCleanUp: () => {},
    useDialogHelper: (initial: boolean) => {
      const [show, setShow] = useState(initial);
      return [show, () => setShow(true), () => setShow(false)];
    },
  };
});

jest.mock("../../../contexts", () => ({
  useTranslation: () => ({
    getText: (key: string, params?: string[]) => (params ? `${key}:${params.join("|")}` : key),
    i18nKeys: new Proxy({}, { get: (_target, prop) => prop }),
  }),
  useUser: () => ({
    user: { isUserAdmin: true, userId: "admin-id", idpUserId: "idp-admin" },
    setUserGroup: jest.fn(),
  }),
  useFeedback: () => ({ setFeedback: mockSetFeedback, setGenericErrorFeedback: mockSetGenericErrorFeedback }),
}));

jest.mock("./EditTenantRoleDialog/EditTenantRoleDialog", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: ({ open, onClose }: any) =>
      open ? React.createElement("button", { onClick: () => onClose("success") }, "mock-save-success") : null,
  };
});

jest.mock("./DeleteUserDialog/DeleteUserDialog", () => ({ __esModule: true, default: () => null }));
jest.mock("./AddUserDialog/AddUserDialog", () => ({ __esModule: true, default: () => null }));
jest.mock("./ChangeUserPasswordDialog/ChangeUserPasswordDialog", () => ({
  ChangeUserPasswordDialog: () => null,
}));
jest.mock("./MoreActionButton", () => ({ MoreActionButton: () => null }));

const UserOverviewAny = UserOverview as any;

beforeEach(() => {
  // CRA's jest config uses resetMocks: true, which clears the resolved value
  // configured in the module factory above — re-prime it before each test.
  const { api } = require("../../../axios/api");
  (api.userMgmt.getUsersWithRoles as jest.Mock).mockResolvedValue([
    { userId: "u1", username: "alice@example.com", tenantId: "t1", roles: [], active: true },
  ]);
});

test("shows success toast with username after a role edit succeeds", async () => {
  render(<UserOverviewAny />);

  // Wait for the user list to load, open the Edit Roles dialog for alice.
  fireEvent.click(await screen.findByText("USER_OVERVIEW__EDIT"));

  // Stubbed dialog reports a successful save.
  fireEvent.click(screen.getByText("mock-save-success"));

  await waitFor(() =>
    expect(mockSetFeedback).toHaveBeenCalledWith({
      variant: "alert",
      type: "success",
      message: "USER_OVERVIEW__EDIT_ROLE_SUCCESS:alice@example.com",
    })
  );
});
