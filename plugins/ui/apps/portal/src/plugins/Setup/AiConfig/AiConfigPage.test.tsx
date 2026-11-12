import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AiConfigPage } from "./AiConfigPage";
import { api } from "../../../axios/api";
import { i18nDefault } from "../../../contexts/app-context/states/translation-state";
import de from "../../../../public/translations/de.json";
import zh from "../../../../public/translations/zh.json";

import { replaceParams } from "../../../contexts/app-context/helpers";

jest.mock("../../../axios/api", () => ({
  api: {
    systemPortal: {
      listAiConfigs: jest.fn(),
      createAiConfig: jest.fn(),
      updateAiConfig: jest.fn(),
      activateAiConfig: jest.fn(),
      deleteAiConfig: jest.fn(),
    },
  },
}));

const mockSetFeedback = jest.fn();
// Stable references, so the page's load effect runs once per mount.
// Phrases with placeholders (titles, bodies, toasts) resolve to their real English text so the copy is
// asserted; every other key resolves to itself.
const mockTranslation = {
  getText: (key: string, params?: string[]) => {
    const phrase = (i18nDefault.default as Record<string, string>)[key];
    return phrase?.includes("{0}") ? replaceParams(phrase, params) : key;
  },
  // `in` answers like the real key map, so the error-code lookup can fall back for unknown codes.
  i18nKeys: new Proxy(
    {},
    { get: (_t, key) => key, has: (_t, key) => key in (i18nDefault.default as Record<string, string>) }
  ),
};
const mockClearFeedback = jest.fn();
const mockGetFeedback = jest.fn();
const mockFeedback = { setFeedback: mockSetFeedback, clearFeedback: mockClearFeedback, getFeedback: mockGetFeedback };
let mockUseRealFeedback = false;
jest.mock("../../../contexts", () => ({
  useTranslation: () => mockTranslation,
  useFeedback: () => (mockUseRealFeedback ? jest.requireActual("../../../contexts").useFeedback() : mockFeedback),
  // The real useFeedback reads these two from this (mocked) module path.
  get AppContext() {
    return jest.requireActual("../../../contexts").AppContext;
  },
  get AppDispatchContext() {
    return jest.requireActual("../../../contexts").AppDispatchContext;
  },
}));

const listAiConfigs = api.systemPortal.listAiConfigs as jest.Mock;

beforeEach(() => {
  listAiConfigs.mockReset();
  mockSetFeedback.mockReset();
  mockClearFeedback.mockReset();
  mockGetFeedback.mockReset();
  mockUseRealFeedback = false;
  (api.systemPortal.activateAiConfig as jest.Mock).mockReset();
  (api.systemPortal.deleteAiConfig as jest.Mock).mockReset();
});

describe("AiConfigPage", () => {
  it("shows the header and the loaded configuration names", async () => {
    listAiConfigs.mockResolvedValue([{ id: 1, name: "Prod" }]);

    render(<AiConfigPage />);

    expect(screen.getByText("AI_CONFIG__EYEBROW")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "AI_CONFIG__TITLE" })).toBeInTheDocument();
    expect(screen.getByText("AI_CONFIG__SUBTITLE")).toBeInTheDocument();
    const addButton = screen.getByRole("button", { name: "AI_CONFIG__ADD" });
    expect(addButton).toBeDisabled();
    expect(within(addButton).getByTestId("AddIcon")).toBeInTheDocument();
    expect(await screen.findByText("Prod")).toBeInTheDocument();
    expect(addButton).toBeEnabled();
    expect(listAiConfigs).toHaveBeenCalledTimes(1);
  });

  it("adds a configuration from the dialog without re-listing", async () => {
    listAiConfigs.mockResolvedValue([]);
    (api.systemPortal.createAiConfig as jest.Mock).mockResolvedValue({ id: 2, name: "Created", isActive: true });
    render(<AiConfigPage />);
    await waitFor(() => expect(screen.getByRole("button", { name: "AI_CONFIG__ADD" })).toBeEnabled());

    await userEvent.click(screen.getByRole("button", { name: "AI_CONFIG__ADD" }));
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(await screen.findByRole("option", { name: "AI_CONFIG__PROVIDER_ANTHROPIC" }));
    await userEvent.type(screen.getByLabelText("AI_CONFIG__ANTHROPIC_API_KEY_LABEL"), "k");
    await userEvent.type(screen.getByLabelText("AI_CONFIG__MODEL_LABEL"), "m");
    await userEvent.click(screen.getByRole("button", { name: "AI_CONFIG__SAVE" }));

    expect(await screen.findByText("Created")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(listAiConfigs).toHaveBeenCalledTimes(1);
  });

  it("reports a failed load through the feedback toast", async () => {
    listAiConfigs.mockRejectedValue({ status: 500 });

    render(<AiConfigPage />);

    await waitFor(() =>
      expect(mockSetFeedback).toHaveBeenCalledWith({
        type: "error",
        variant: "alert",
        message: "AI_CONFIG__LOAD_ERROR",
      })
    );
    // An unknown list must not be presented as "no configurations".
    expect(screen.queryByText("AI_CONFIG__EMPTY_TITLE")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "AI_CONFIG__ADD" })).toBeDisabled());
  });

  it("clears its own load error when a load succeeds", async () => {
    mockGetFeedback.mockReturnValue({ type: "error", variant: "alert", message: "AI_CONFIG__LOAD_ERROR" });
    listAiConfigs.mockResolvedValue([]);
    render(<AiConfigPage />);
    await screen.findByText("AI_CONFIG__EMPTY_TITLE");
    expect(mockClearFeedback).toHaveBeenCalledTimes(1);
  });

  it("lists once when the load fails, even though setting the error feedback re-renders the page", async () => {
    mockUseRealFeedback = true;
    const { AppProvider, useFeedback } = jest.requireActual("../../../contexts");
    const Probe = () => <div data-testid="feedback">{useFeedback().getFeedback()?.message}</div>;
    listAiConfigs.mockRejectedValue({ status: 500 });

    render(
      <AppProvider>
        <AiConfigPage />
        <Probe />
      </AppProvider>
    );

    await waitFor(() => expect(screen.getByTestId("feedback")).toHaveTextContent("AI_CONFIG__LOAD_ERROR"));
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    expect(listAiConfigs).toHaveBeenCalledTimes(1);
  });

  it("keeps unrelated feedback when a load succeeds", async () => {
    mockGetFeedback.mockReturnValue({ type: "success", variant: "alert", message: "Language updated" });
    listAiConfigs.mockResolvedValue([]);
    render(<AiConfigPage />);
    await screen.findByText("AI_CONFIG__EMPTY_TITLE");
    expect(mockClearFeedback).not.toHaveBeenCalled();
  });
});

describe("AiConfigPage list", () => {
  const row = (id: number, name: string, isActive = false) => ({
    id,
    name,
    provider: "bedrock",
    model: `model-${name}`,
    baseUrl: null,
    region: "us-east-2",
    workspaceId: null,
    isActive,
  });

  it("shows the empty state with zero rows", async () => {
    listAiConfigs.mockResolvedValue([]);
    render(<AiConfigPage />);
    expect(await screen.findByText("AI_CONFIG__EMPTY_TITLE")).toBeInTheDocument();
    expect(screen.getByText("AI_CONFIG__EMPTY_DESCRIPTION")).toBeInTheDocument();
  });

  it("lists active first with the chip, and shows provider, model and connection", async () => {
    listAiConfigs.mockResolvedValue([row(1, "Beta"), row(2, "Zeta", true), row(3, "Alpha")]);
    render(<AiConfigPage />);
    const items = await screen.findAllByRole("listitem");
    expect(items.map((li) => within(li).getByText(/^(Alpha|Beta|Zeta)$/).textContent)).toEqual([
      "Zeta",
      "Alpha",
      "Beta",
    ]);
    expect(within(items[0]).getByText("AI_CONFIG__ACTIVE")).toBeInTheDocument();
    expect(within(items[1]).queryByText("AI_CONFIG__ACTIVE")).not.toBeInTheDocument();
    expect(within(items[0]).getByText("AI_CONFIG__PROVIDER_BEDROCK")).toBeInTheDocument();
    expect(within(items[0]).getByText("model-Zeta")).toBeInTheDocument();
    expect(within(items[0]).getByText("AI_CONFIG__CONNECTION_API_KEY · us-east-2")).toBeInTheDocument();
  });

  it("edits a row, replaces it from the response and re-sorts", async () => {
    listAiConfigs.mockResolvedValue([row(1, "Active", true), row(2, "Alpha"), row(3, "Beta")]);
    (api.systemPortal.updateAiConfig as jest.Mock).mockResolvedValue(row(2, "Zulu"));
    render(<AiConfigPage />);
    await userEvent.click(await screen.findByRole("button", { name: "AI_CONFIG__EDIT Alpha" }));
    const nameInput = screen.getByLabelText("AI_CONFIG__NAME_LABEL");
    expect(nameInput).toHaveValue("Alpha");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Zulu");
    await userEvent.click(screen.getByRole("button", { name: "AI_CONFIG__SAVE" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    // Retry: MUI can leave the root aria-hidden for a moment after the dialog unmounts (seen on slow CI runners).
    await waitFor(() =>
      expect(
        screen.getAllByRole("listitem").map((li) => within(li).getByText(/^(Active|Zulu|Beta)$/).textContent)
      ).toEqual(["Active", "Beta", "Zulu"])
    );
    expect(listAiConfigs).toHaveBeenCalledTimes(1);
  });
});

describe("AiConfigPage row actions", () => {
  const row = (id: number, name: string, isActive = false) => ({
    id,
    name,
    provider: "bedrock",
    model: `model-${name}`,
    baseUrl: null,
    region: "us-east-2",
    workspaceId: null,
    isActive,
  });
  const activateMock = api.systemPortal.activateAiConfig as jest.Mock;
  const deleteMock = api.systemPortal.deleteAiConfig as jest.Mock;
  const names = (all: string[]) =>
    screen.getAllByRole("listitem").map((li) => within(li).getByText(new RegExp(`^(${all.join("|")})$`)).textContent);
  // Row checks after a dialog closes retry: MUI can leave the root aria-hidden for a moment after the dialog
  // unmounts (seen on slow CI runners), and role queries skip aria-hidden content.
  const expectNames = (all: string[], expected: string[]) => waitFor(() => expect(names(all)).toEqual(expected));
  const expectRowCount = (n: number) => waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(n));
  const openMenu = async (name: string) =>
    userEvent.click(await screen.findByRole("button", { name: `AI_CONFIG__MORE_ACTIONS ${name}` }));
  // The toast content is a React node; render it to inspect the DOM it produces.
  const renderedToast = () => {
    const call = mockSetFeedback.mock.calls.map(([f]) => f).find((f) => f.messageNode);
    expect(call).toMatchObject({ variant: "alert", type: "success", autoClose: 5000 });
    return render(<div data-testid="toast">{call.messageNode}</div>).getByTestId("toast");
  };

  it("hides Set as active on the active row and offers it on the others", async () => {
    listAiConfigs.mockResolvedValue([row(1, "Active", true), row(2, "Beta")]);
    render(<AiConfigPage />);
    await openMenu("Active");
    expect(screen.queryByRole("menuitem", { name: "AI_CONFIG__SET_ACTIVE" })).not.toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    await openMenu("Beta");
    expect(await screen.findByRole("menuitem", { name: "AI_CONFIG__SET_ACTIVE" })).toBeInTheDocument();
  });

  it("enables Delete on every row, with no tooltip", async () => {
    listAiConfigs.mockResolvedValue([row(1, "Active", true), row(2, "Beta")]);
    render(<AiConfigPage />);
    for (const name of ["Active", "Beta"]) {
      await openMenu(name);
      const item = await screen.findByRole("menuitem", { name: "AI_CONFIG__DELETE" });
      expect(item).toBeEnabled();
      expect(item).not.toHaveAccessibleDescription();
      await userEvent.keyboard("{Escape}");
    }
  });

  it("sets a row active after confirmation, re-sorts from the response and shows the bold-name toast", async () => {
    listAiConfigs.mockResolvedValue([row(1, "Zed", true), row(2, "Alpha"), row(3, "Beta")]);
    activateMock.mockResolvedValue(row(3, "Beta", true));
    render(<AiConfigPage />);
    await openMenu("Beta");
    await userEvent.click(await screen.findByRole("menuitem", { name: "AI_CONFIG__SET_ACTIVE" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: 'Set "Beta" as active?' })).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        'The AI assistant will switch from "Zed" to "Beta" (model-Beta) for everyone in your organization.'
      )
    ).toBeInTheDocument();
    expect(activateMock).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole("button", { name: "AI_CONFIG__SET_ACTIVE" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(activateMock).toHaveBeenCalledWith(3);
    await expectNames(["Zed", "Alpha", "Beta"], ["Beta", "Alpha", "Zed"]);
    expect(within(screen.getAllByRole("listitem")[0]).getByText("AI_CONFIG__ACTIVE")).toBeInTheDocument();
    expect(screen.getAllByText("AI_CONFIG__ACTIVE")).toHaveLength(1);
    expect(listAiConfigs).toHaveBeenCalledTimes(1);
    const toast = renderedToast();
    expect(toast).toHaveTextContent("Beta is now the active AI configuration.");
    expect(toast.querySelector("strong")).toHaveTextContent("Beta");
  });

  it("deletes a row after confirmation and shows the bold-name toast, rendering markup in a name as text", async () => {
    listAiConfigs.mockResolvedValue([row(1, "Active", true), row(2, "<b>x</b>")]);
    deleteMock.mockResolvedValue({ id: 2 });
    render(<AiConfigPage />);
    await openMenu("<b>x</b>");
    await userEvent.click(await screen.findByRole("menuitem", { name: "AI_CONFIG__DELETE" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "AI_CONFIG__DELETE_TITLE" })).toBeInTheDocument();
    expect(dialog).toHaveTextContent(
      "Are you sure you want to delete this AI configuration: <b>x</b>? This action cannot be undone."
    );
    expect(within(dialog).getByText("<b>x</b>").tagName).toBe("STRONG");
    expect(deleteMock).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole("button", { name: "AI_CONFIG__DELETE_CONFIRM" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(deleteMock).toHaveBeenCalledWith(2, undefined);
    await expectRowCount(1);
    expect(listAiConfigs).toHaveBeenCalledTimes(1);
    const toast = renderedToast();
    expect(toast).toHaveTextContent("<b>x</b> AI configuration has been deleted successfully.");
    expect(toast.querySelector("strong")).toHaveTextContent("<b>x</b>");
    expect(toast.querySelector("b")).toBeNull();
  });

  it("shows the empty state after the last configuration is deleted", async () => {
    listAiConfigs.mockResolvedValue([row(1, "Only", true)]);
    deleteMock.mockResolvedValue({ id: 1 });
    render(<AiConfigPage />);
    await openMenu("Only");
    await userEvent.click(await screen.findByRole("menuitem", { name: "AI_CONFIG__DELETE" }));
    await userEvent.click(await screen.findByRole("button", { name: "AI_CONFIG__DELETE_CONFIRM" }));
    expect(await screen.findByText("AI_CONFIG__EMPTY_TITLE")).toBeInTheDocument();
  });

  it("does nothing when the confirm dialog is cancelled", async () => {
    listAiConfigs.mockResolvedValue([row(1, "Active", true), row(2, "Beta")]);
    render(<AiConfigPage />);
    await openMenu("Beta");
    await userEvent.click(await screen.findByRole("menuitem", { name: "AI_CONFIG__DELETE" }));
    await userEvent.click(await screen.findByRole("button", { name: "AI_CONFIG__CANCEL" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(deleteMock).not.toHaveBeenCalled();
    await expectRowCount(2);
  });

  it("shows the server's own message when the active row cannot be deleted", async () => {
    listAiConfigs.mockResolvedValue([row(1, "Only", true)]);
    deleteMock.mockRejectedValue({ data: { code: "AI_CONFIG_ACTIVE_DELETE" } });
    render(<AiConfigPage />);
    await openMenu("Only");
    await userEvent.click(await screen.findByRole("menuitem", { name: "AI_CONFIG__DELETE" }));
    await userEvent.click(await screen.findByRole("button", { name: "AI_CONFIG__DELETE_CONFIRM" }));
    await waitFor(() =>
      expect(mockSetFeedback).toHaveBeenCalledWith({
        type: "error",
        variant: "alert",
        message: "AI_CONFIG__ERROR__ACTIVE_DELETE",
      })
    );
    await expectRowCount(1);
  });

  const openActivate = async (name: string) => {
    await openMenu(name);
    await userEvent.click(await screen.findByRole("menuitem", { name: "AI_CONFIG__SET_ACTIVE" }));
    return screen.findByRole("dialog");
  };

  it("shows the switching state without a dropdown and ignores a second click while pending", async () => {
    listAiConfigs.mockResolvedValue([row(1, "Zed", true), row(2, "Beta")]);
    let resolve!: (r: unknown) => void;
    activateMock.mockReturnValue(new Promise((r) => (resolve = r)));
    render(<AiConfigPage />);
    const dialog = await openActivate("Beta");
    const primary = within(dialog).getByRole("button", { name: "AI_CONFIG__SET_ACTIVE" });
    fireEvent.click(primary);

    expect(await within(dialog).findByRole("heading", { name: "AI_CONFIG__SWITCHING_TITLE" })).toBeInTheDocument();
    expect(dialog).toHaveTextContent("Switching from Zed to Beta (model-Beta) for everyone in your organization.");
    expect([...dialog.querySelectorAll("strong")].map((e) => e.textContent)).toEqual(["Zed", "Beta"]);
    expect(within(dialog).getByRole("status")).toHaveTextContent("AI_CONFIG__SWITCHING");
    expect(within(dialog).getByRole("button", { name: "AI_CONFIG__SWITCHING_BUTTON" })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "AI_CONFIG__CANCEL" })).toBeDisabled();
    expect(within(dialog).queryByRole("button", { name: "AI_CONFIG__CLOSE" })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("combobox")).not.toBeInTheDocument();
    // The primary is disabled now, so a second click cannot send a second request.
    await userEvent.click(within(dialog).getByRole("button", { name: "AI_CONFIG__SWITCHING_BUTTON" }), undefined, {
      skipPointerEventsCheck: true,
    });
    expect(activateMock).toHaveBeenCalledTimes(1);

    await act(async () => resolve(row(2, "Beta", true)));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("keeps the dialog open when activate fails, then retries and can be cancelled", async () => {
    listAiConfigs.mockResolvedValue([row(1, "Zed", true), row(2, "Beta")]);
    activateMock.mockRejectedValueOnce({ status: 500 });
    render(<AiConfigPage />);
    const dialog = await openActivate("Beta");
    await userEvent.click(within(dialog).getByRole("button", { name: "AI_CONFIG__SET_ACTIVE" }));

    expect(await within(dialog).findByRole("heading", { name: "AI_CONFIG__SWITCH_FAILED_TITLE" })).toBeInTheDocument();
    expect(dialog).toHaveTextContent("Zed is still active. No changes were applied for your organization.");
    expect(dialog.querySelector("strong")).toHaveTextContent("Zed");
    expect(within(dialog).getByText("AI_CONFIG__SWITCH_FAILED")).toBeInTheDocument();
    expect(within(dialog).queryByRole("combobox")).not.toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "AI_CONFIG__CLOSE" })).toBeInTheDocument();
    expect(mockSetFeedback).not.toHaveBeenCalled();

    activateMock.mockResolvedValueOnce(row(2, "Beta", true));
    await userEvent.click(within(dialog).getByRole("button", { name: "AI_CONFIG__TRY_AGAIN" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(activateMock).toHaveBeenCalledTimes(2);
    await expectNames(["Zed", "Beta"], ["Beta", "Zed"]);
  });

  it("closes a failed activate dialog with Cancel and changes nothing", async () => {
    listAiConfigs.mockResolvedValue([row(1, "Zed", true), row(2, "Beta")]);
    activateMock.mockRejectedValue(new Error("network"));
    render(<AiConfigPage />);
    const dialog = await openActivate("Beta");
    await userEvent.click(within(dialog).getByRole("button", { name: "AI_CONFIG__SET_ACTIVE" }));
    await within(dialog).findByRole("heading", { name: "AI_CONFIG__SWITCH_FAILED_TITLE" });
    await userEvent.click(within(dialog).getByRole("button", { name: "AI_CONFIG__CANCEL" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await expectNames(["Zed", "Beta"], ["Zed", "Beta"]);
    expect(activateMock).toHaveBeenCalledTimes(1);
  });

  it("keeps the delete dialog open on a generic failure with a banner and Try again", async () => {
    listAiConfigs.mockResolvedValue([row(1, "Active", true), row(2, "Beta")]);
    deleteMock.mockRejectedValueOnce({ status: 500 });
    render(<AiConfigPage />);
    await openMenu("Beta");
    await userEvent.click(await screen.findByRole("menuitem", { name: "AI_CONFIG__DELETE" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "AI_CONFIG__DELETE_CONFIRM" }));

    expect(await within(dialog).findByText("AI_CONFIG__ACTION_ERROR")).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: "AI_CONFIG__DELETE_TITLE" })).toBeInTheDocument();
    expect(mockSetFeedback).not.toHaveBeenCalled();

    deleteMock.mockResolvedValueOnce({ id: 2 });
    await userEvent.click(within(dialog).getByRole("button", { name: "AI_CONFIG__TRY_AGAIN" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(deleteMock).toHaveBeenCalledTimes(2);
    await expectRowCount(1);
  });

  it("closes the delete dialog with the mapped toast when the row turned active meanwhile", async () => {
    listAiConfigs.mockResolvedValue([row(1, "Active", true), row(2, "Beta")]);
    deleteMock.mockRejectedValue({ data: { code: "AI_CONFIG_ACTIVE_DELETE" } });
    render(<AiConfigPage />);
    await openMenu("Beta");
    await userEvent.click(await screen.findByRole("menuitem", { name: "AI_CONFIG__DELETE" }));
    await userEvent.click(await screen.findByRole("button", { name: "AI_CONFIG__DELETE_CONFIRM" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(mockSetFeedback).toHaveBeenCalledWith({
      type: "error",
      variant: "alert",
      message: "AI_CONFIG__ERROR__ACTIVE_DELETE",
    });
    await expectRowCount(2);
    // The list is re-read so the next Delete opens the right variant.
    expect(listAiConfigs).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["activate", "AI_CONFIG__SET_ACTIVE", "AI_CONFIG__SET_ACTIVE"],
    ["delete", "AI_CONFIG__DELETE", "AI_CONFIG__DELETE_CONFIRM"],
  ])(
    "drops the row when %s finds it already deleted, still shows the error and does not re-list",
    async (action, menuItem, confirmButton) => {
      listAiConfigs.mockResolvedValue([row(1, "Active", true), row(2, "Beta")]);
      (action === "activate" ? activateMock : deleteMock).mockRejectedValue({ data: { code: "AI_CONFIG_NOT_FOUND" } });
      render(<AiConfigPage />);
      await openMenu("Beta");
      await userEvent.click(await screen.findByRole("menuitem", { name: menuItem }));
      await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: confirmButton }));
      await waitFor(() =>
        expect(mockSetFeedback).toHaveBeenCalledWith({
          type: "error",
          variant: "alert",
          message: "AI_CONFIG__ERROR__NOT_FOUND",
        })
      );
      await expectNames(["Active", "Beta"], ["Active"]);
      expect(listAiConfigs).toHaveBeenCalledTimes(1);
    }
  );

  it("drops the row, closes the Edit dialog and shows the toast when the save finds it already deleted", async () => {
    listAiConfigs.mockResolvedValue([row(1, "Active", true), row(2, "Beta")]);
    (api.systemPortal.updateAiConfig as jest.Mock).mockRejectedValue({ data: { code: "AI_CONFIG_NOT_FOUND" } });
    render(<AiConfigPage />);
    await userEvent.click(await screen.findByRole("button", { name: "AI_CONFIG__EDIT Beta" }));
    await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "AI_CONFIG__SAVE" }));
    await waitFor(() =>
      expect(mockSetFeedback).toHaveBeenCalledWith({
        type: "error",
        variant: "alert",
        message: "AI_CONFIG__ERROR__NOT_FOUND",
      })
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await expectNames(["Active", "Beta"], ["Active"]);
  });

  // The last toast set with a messageNode, rendered to inspect the DOM.
  const lastToasts = () => {
    const f = mockSetFeedback.mock.calls
      .map(([x]) => x)
      .filter((x) => x.messageNode)
      .pop();
    const { container } = render(
      <div>
        <div data-testid="first">{f.messageNode}</div>
      </div>
    );
    return { first: within(container).getByTestId("first") };
  };
  const openDelete = async (name: string) => {
    await openMenu(name);
    await userEvent.click(await screen.findByRole("menuitem", { name: "AI_CONFIG__DELETE" }));
    return screen.findByRole("dialog");
  };
  const pick = async (dialog: HTMLElement, name: string) => {
    await userEvent.click(within(dialog).getByRole("combobox"));
    await userEvent.click(await screen.findByRole("option", { name }));
  };
  const deferred = () => {
    let resolve!: (v: unknown) => void;
    const promise = new Promise((r) => (resolve = r));
    return { promise, resolve };
  };

  describe("Delete variants", () => {
    it("delete active: lists the other rows, needs a pick, sends (id, pick), promotes the pick and shows one toast", async () => {
      listAiConfigs.mockResolvedValue([row(1, "Zed", true), row(2, "Beta"), row(3, "Alpha")]);
      deleteMock.mockResolvedValue({ id: 1 });
      render(<AiConfigPage />);
      const dialog = await openDelete("Zed");

      expect(within(dialog).getByRole("heading", { name: "AI_CONFIG__DELETE_ACTIVE_TITLE" })).toBeInTheDocument();
      expect(dialog).toHaveTextContent("Zed is the active configuration. Choose which configuration");
      expect(within(dialog).getByRole("button", { name: "AI_CONFIG__DELETE_CONFIRM" })).toBeDisabled();
      await userEvent.click(within(dialog).getByRole("combobox"));
      expect((await screen.findAllByRole("option")).map((o) => o.textContent)).toEqual(["Alpha", "Beta"]);
      await userEvent.click(screen.getByRole("option", { name: "Beta" }));
      await userEvent.click(within(dialog).getByRole("button", { name: "AI_CONFIG__DELETE_CONFIRM" }));

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(deleteMock).toHaveBeenCalledWith(1, 2);
      await expectNames(["Zed", "Alpha", "Beta"], ["Beta", "Alpha"]);
      expect(within(screen.getAllByRole("listitem")[0]).getByText("AI_CONFIG__ACTIVE")).toBeInTheDocument();
      const { first } = lastToasts();
      expect(first).toHaveTextContent("Zed has been deleted. Beta is now the active configuration.");
      expect([...first.querySelectorAll("strong")].map((e) => e.textContent)).toEqual(["Zed", "Beta"]);
    });

    it("delete last: sends no replacement, empties the list and shows one toast", async () => {
      listAiConfigs.mockResolvedValue([row(1, "Only", true)]);
      deleteMock.mockResolvedValue({ id: 1 });
      render(<AiConfigPage />);
      const dialog = await openDelete("Only");
      await userEvent.click(within(dialog).getByRole("button", { name: "AI_CONFIG__DELETE_CONFIRM" }));

      expect(await screen.findByText("AI_CONFIG__EMPTY_TITLE")).toBeInTheDocument();
      expect(deleteMock).toHaveBeenCalledWith(1, undefined);
      const { first } = lastToasts();
      expect(first).toHaveTextContent("Only AI configuration has been deleted successfully.");
      expect(first.querySelector("strong")).toHaveTextContent("Only");
    });

    it.each([
      ["plain", [row(1, "Active", true), row(2, "Beta")], "Beta"],
      ["active", [row(1, "Active", true), row(2, "Beta")], "Active"],
      ["only", [row(1, "Only", true)], "Only"],
    ])(
      "%s: a pending delete shows the deleting copy, locks the dialog and ignores a second click",
      async (variant, rows, name) => {
        listAiConfigs.mockResolvedValue(rows);
        const pending = deferred();
        deleteMock.mockReturnValue(pending.promise);
        render(<AiConfigPage />);
        const dialog = await openDelete(name);
        if (variant === "active") await pick(dialog, "Beta");
        await userEvent.click(within(dialog).getByRole("button", { name: "AI_CONFIG__DELETE_CONFIRM" }));

        expect(await within(dialog).findByRole("heading", { name: "AI_CONFIG__DELETING_TITLE" })).toBeInTheDocument();
        expect(dialog).toHaveTextContent(`${name} is being deleted. This configuration will be removed`);
        expect(within(dialog).getByText(name, { selector: "strong" })).toBeInTheDocument();
        expect(within(dialog).getByRole("status")).toHaveTextContent(`Deleting ${name}... Please wait`);
        expect(within(dialog).getByRole("button", { name: "AI_CONFIG__CANCEL" })).toBeDisabled();
        const primary = within(dialog).getByRole("button", { name: "AI_CONFIG__DELETING_BUTTON" });
        expect(primary).toBeDisabled();
        expect(within(dialog).queryByRole("button", { name: "AI_CONFIG__CLOSE" })).not.toBeInTheDocument();
        expect(within(dialog).queryByRole("combobox")).not.toBeInTheDocument();
        fireEvent.click(primary);
        expect(deleteMock).toHaveBeenCalledTimes(1);
        pending.resolve({ id: 1 });
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      }
    );

    it("delete active failure keeps the choice, shows the failed copy and Try again re-sends (id, pick)", async () => {
      listAiConfigs.mockResolvedValue([row(1, "Zed", true), row(2, "Beta")]);
      deleteMock.mockRejectedValueOnce({ status: 500 });
      render(<AiConfigPage />);
      const dialog = await openDelete("Zed");
      await pick(dialog, "Beta");
      await userEvent.click(within(dialog).getByRole("button", { name: "AI_CONFIG__DELETE_CONFIRM" }));

      expect(
        await within(dialog).findByRole("heading", { name: "AI_CONFIG__DELETE_SWITCH_FAILED_TITLE" })
      ).toBeInTheDocument();
      expect(dialog).toHaveTextContent("Zed was not deleted and is still active. Beta has not been activated.");
      expect([...dialog.querySelectorAll("strong")].map((e) => e.textContent)).toEqual(["Zed", "Beta"]);
      expect(within(dialog).getByText("AI_CONFIG__DELETE_SWITCH_FAILED")).toBeInTheDocument();
      expect(within(dialog).getByText("AI_CONFIG__DELETE_ACTIVE_PICK_HINT")).toBeInTheDocument();
      expect(within(dialog).getByRole("combobox")).toHaveTextContent("Beta");
      expect(within(dialog).getByRole("button", { name: "AI_CONFIG__CLOSE" })).toBeInTheDocument();
      expect(mockSetFeedback).not.toHaveBeenCalled();

      deleteMock.mockResolvedValueOnce({ id: 1 });
      await userEvent.click(within(dialog).getByRole("button", { name: "AI_CONFIG__TRY_AGAIN" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(deleteMock).toHaveBeenLastCalledWith(1, 2);
    });

    it("delete active with the pick deleted meanwhile drops it, clears the choice and disables Try again", async () => {
      listAiConfigs.mockResolvedValue([row(1, "Zed", true), row(2, "Beta"), row(3, "Gamma")]);
      deleteMock.mockRejectedValueOnce({ data: { code: "AI_CONFIG_INVALID", field: "newActiveId" } });
      render(<AiConfigPage />);
      const dialog = await openDelete("Zed");
      await pick(dialog, "Beta");
      await userEvent.click(within(dialog).getByRole("button", { name: "AI_CONFIG__DELETE_CONFIRM" }));

      await within(dialog).findByRole("heading", { name: "AI_CONFIG__DELETE_SWITCH_FAILED_TITLE" });
      expect(within(dialog).getByRole("button", { name: "AI_CONFIG__TRY_AGAIN" })).toBeDisabled();
      await userEvent.click(within(dialog).getByRole("combobox"));
      expect((await screen.findAllByRole("option")).map((o) => o.textContent)).toEqual(["Gamma"]);
      await userEvent.click(screen.getByRole("option", { name: "Gamma" }));
      expect(within(dialog).getByRole("button", { name: "AI_CONFIG__TRY_AGAIN" })).toBeEnabled();
    });

    it("delete active with the only other row deleted meanwhile closes, shows the toast and re-fetches", async () => {
      listAiConfigs.mockResolvedValue([row(1, "Zed", true), row(2, "Beta")]);
      deleteMock.mockRejectedValueOnce({ data: { code: "AI_CONFIG_INVALID", field: "newActiveId" } });
      render(<AiConfigPage />);
      const dialog = await openDelete("Zed");
      await pick(dialog, "Beta");
      listAiConfigs.mockResolvedValue([row(1, "Zed", true)]);
      await userEvent.click(within(dialog).getByRole("button", { name: "AI_CONFIG__DELETE_CONFIRM" }));

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(mockSetFeedback).toHaveBeenCalledWith({
        type: "error",
        variant: "alert",
        message: "AI_CONFIG__ERROR__ACTIVE_DELETE",
      });
      expect(listAiConfigs).toHaveBeenCalledTimes(2);
      await expectRowCount(1);
    });

    it("a failed last delete keeps the idle copy and Try again", async () => {
      listAiConfigs.mockResolvedValue([row(1, "Only", true)]);
      deleteMock.mockRejectedValueOnce({ status: 500 });
      render(<AiConfigPage />);
      const dialog = await openDelete("Only");
      await userEvent.click(within(dialog).getByRole("button", { name: "AI_CONFIG__DELETE_CONFIRM" }));

      expect(await within(dialog).findByText("AI_CONFIG__ACTION_ERROR")).toBeInTheDocument();
      expect(within(dialog).getByRole("heading", { name: "AI_CONFIG__DELETE_TITLE" })).toBeInTheDocument();
      expect(within(dialog).getByRole("button", { name: "AI_CONFIG__TRY_AGAIN" })).toBeEnabled();
    });

    it("an ACTIVE_DELETE on a last delete closes with the toast and re-fetches the list", async () => {
      listAiConfigs.mockResolvedValue([row(1, "Only", true)]);
      deleteMock.mockRejectedValueOnce({ data: { code: "AI_CONFIG_ACTIVE_DELETE" } });
      render(<AiConfigPage />);
      const dialog = await openDelete("Only");
      listAiConfigs.mockResolvedValue([row(1, "Only", true), row(2, "New")]);
      await userEvent.click(within(dialog).getByRole("button", { name: "AI_CONFIG__DELETE_CONFIRM" }));

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(listAiConfigs).toHaveBeenCalledTimes(2);
      await expectRowCount(2);
    });
  });

  describe("Add toast", () => {
    it("shows the Add toast with the bold name after a successful add", async () => {
      listAiConfigs.mockResolvedValue([]);
      (api.systemPortal.createAiConfig as jest.Mock).mockResolvedValue(row(5, "Fresh", true));
      render(<AiConfigPage />);
      await waitFor(() => expect(screen.getByRole("button", { name: "AI_CONFIG__ADD" })).toBeEnabled());
      await userEvent.click(screen.getByRole("button", { name: "AI_CONFIG__ADD" }));
      await userEvent.click(screen.getByRole("combobox"));
      await userEvent.click(await screen.findByRole("option", { name: "AI_CONFIG__PROVIDER_ANTHROPIC" }));
      await userEvent.type(screen.getByLabelText("AI_CONFIG__ANTHROPIC_API_KEY_LABEL"), "k");
      await userEvent.type(screen.getByLabelText("AI_CONFIG__MODEL_LABEL"), "m");
      await userEvent.click(screen.getByRole("button", { name: "AI_CONFIG__SAVE" }));

      await screen.findByText("Fresh");
      const { first } = lastToasts();
      expect(first).toHaveTextContent("Fresh AI configuration has been added successfully.");
      expect(first.querySelector("strong")).toHaveTextContent("Fresh");
    });
  });
});

describe("AI configuration translations", () => {
  const keys = Object.keys(i18nDefault.default).filter((key) => key.includes("AI_CONFIG"));

  it.each(keys)("%s exists in de and zh", (key) => {
    expect((de as Record<string, string>)[key]).toBeTruthy();
    expect((zh as Record<string, string>)[key]).toBeTruthy();
  });

  it.each([
    ["en", i18nDefault.default as Record<string, string>],
    ["de", de as Record<string, string>],
    ["zh", zh as Record<string, string>],
  ])("%s toast and delete-body strings contain {0} exactly once", (_locale, texts) => {
    for (const key of [
      "AI_CONFIG__ACTIVATED_TOAST",
      "AI_CONFIG__DELETED_TOAST",
      "AI_CONFIG__DELETE_BODY",
      "AI_CONFIG__ADDED_TOAST",
      "AI_CONFIG__DELETE_ACTIVE_BODY",
      "AI_CONFIG__DELETED_REPLACED_TOAST",
    ]) {
      expect(texts[key].split("{0}")).toHaveLength(2);
    }
    expect(texts.AI_CONFIG__DELETED_REPLACED_TOAST.split("{1}")).toHaveLength(2);
  });

  it.each([
    ["de", de as Record<string, string>],
    ["zh", zh as Record<string, string>],
  ])("%s no longer has the removed delete tooltip", (_locale, texts) => {
    expect(texts.AI_CONFIG__DELETE_DISABLED_HINT).toBeUndefined();
  });
});
