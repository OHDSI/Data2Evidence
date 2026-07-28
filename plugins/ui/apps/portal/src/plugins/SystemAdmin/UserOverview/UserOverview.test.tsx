import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { UserOverview } from "./UserOverview";

const mockSetFeedback = jest.fn();
const mockSetGenericErrorFeedback = jest.fn();
const mockSetSuccessFeedback = jest.fn();

jest.mock("../../../contexts", () => ({
  useFeedback: () => ({
    setFeedback: mockSetFeedback,
    setGenericErrorFeedback: mockSetGenericErrorFeedback,
    setSuccessFeedback: mockSetSuccessFeedback,
  }),
  useTranslation: () => ({
    getText: (key: string, params?: string[]) => (params ? `${key}:${params.join("|")}` : key),
    i18nKeys: new Proxy({}, { get: (_target, prop) => prop }),
  }),
  useUser: () => ({ user: { isUserAdmin: true } }),
}));

const mockTenants: any[] = [];
jest.mock("../../../hooks", () => {
  const MockReact = require("react");
  return {
    // stable reference: a new array per render would recreate fetchUserOverview
    // and re-fire the mount effect forever
    useTenants: () => [mockTenants],
    useGroupCleanUp: () => {},
    useDialogHelper: (initial: boolean) => {
      const [show, setShow] = MockReact.useState(initial);
      return [show, () => setShow(true), () => setShow(false)];
    },
  };
});

jest.mock("../../../axios/api", () => ({
  api: {
    userMgmt: {
      getUsersWithRoles: jest.fn(),
      activateUser: jest.fn(),
    },
  },
}));

jest.mock(
  "@portal/components",
  () => {
    const MockReact = require("react");
    return {
      Button: (props: any) => MockReact.createElement("button", { onClick: props.onClick }, props.text),
      IconButton: (props: any) => MockReact.createElement("button", { onClick: props.onClick, title: props.title }),
      Loader: () => MockReact.createElement("div", null, "loading"),
      TableCell: (props: any) => MockReact.createElement("td", null, props.children),
      TableRow: (props: any) => MockReact.createElement("tr", null, props.children),
      EditIcon: () => null,
      TrashIcon: () => null,
    };
    // virtual: the package's dist build may not exist in the test environment
  },
  { virtual: true }
);

jest.mock("./AddUserDialog/AddUserDialog", () => () => null);
jest.mock("./DeleteUserDialog/DeleteUserDialog", () => () => null);
jest.mock("./EditTenantRoleDialog/EditTenantRoleDialog", () => {
  const MockReact = require("react");
  return {
    __esModule: true,
    default: ({ open, onClose }: any) =>
      open ? MockReact.createElement("button", { onClick: () => onClose("success") }, "mock-save-success") : null,
  };
});
jest.mock("./ChangeUserPasswordDialog/ChangeUserPasswordDialog", () => ({
  ChangeUserPasswordDialog: () => null,
}));
jest.mock("./MoreActionButton", () => {
  const MockReact = require("react");
  return {
    MoreActionButton: (props: any) =>
      MockReact.createElement("button", { onClick: props.onActivateClick }, `toggle-active-${props.user.username}`),
  };
});

const { api } = jest.requireMock("../../../axios/api");

const activeUser = { userId: "u1", username: "alice", tenantId: "t1", roles: [], active: true };

const renderAndToggleUser = async () => {
  render(<UserOverview {...({} as any)} />);
  fireEvent.click(await screen.findByText("toggle-active-alice"));
};

beforeEach(() => {
  jest.clearAllMocks();
  api.userMgmt.getUsersWithRoles.mockResolvedValue([activeUser]);
});

test("shows only the error toast when the activate/deactivate request fails", async () => {
  api.userMgmt.activateUser.mockRejectedValue(new Error("boom"));

  await renderAndToggleUser();

  await waitFor(() =>
    expect(mockSetFeedback).toHaveBeenCalledWith({
      variant: "alert",
      type: "error",
      message: "USER_OVERVIEW__DEACTIVATE_ERROR",
      autoClose: 5000,
    })
  );
  expect(mockSetSuccessFeedback).not.toHaveBeenCalled();
  // no refresh is attempted after a failed mutation (only the initial mount fetch)
  expect(api.userMgmt.getUsersWithRoles).toHaveBeenCalledTimes(1);
});

test("does not show the success toast when the refresh after the mutation fails", async () => {
  api.userMgmt.activateUser.mockResolvedValue(undefined);
  api.userMgmt.getUsersWithRoles
    .mockResolvedValueOnce([activeUser]) // initial mount fetch
    .mockRejectedValueOnce(new Error("refresh failed"));

  await renderAndToggleUser();

  await waitFor(() => expect(mockSetGenericErrorFeedback).toHaveBeenCalled());
  expect(mockSetSuccessFeedback).not.toHaveBeenCalled();
});

test("shows only the success toast when mutation and refresh succeed", async () => {
  api.userMgmt.activateUser.mockResolvedValue(undefined);

  await renderAndToggleUser();

  await waitFor(() => expect(mockSetSuccessFeedback).toHaveBeenCalledWith("USER_OVERVIEW__DEACTIVATE_SUCCESS"));
  expect(mockSetFeedback).not.toHaveBeenCalled();
  expect(mockSetGenericErrorFeedback).not.toHaveBeenCalled();
});

test("shows the success toast with the edited user's name after a role edit succeeds", async () => {
  render(<UserOverview {...({} as any)} />);

  // Open the Edit Roles dialog for alice (IconButton mock exposes the title).
  fireEvent.click(await screen.findByTitle("USER_OVERVIEW__EDIT"));

  // Stubbed dialog reports a successful save.
  fireEvent.click(screen.getByText("mock-save-success"));

  await waitFor(() => expect(mockSetSuccessFeedback).toHaveBeenCalledWith("USER_OVERVIEW__EDIT_ROLE_SUCCESS:alice"));
  expect(mockSetFeedback).not.toHaveBeenCalled();
});
