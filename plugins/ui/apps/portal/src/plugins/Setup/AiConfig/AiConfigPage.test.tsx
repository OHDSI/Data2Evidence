import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AiConfigPage } from "./AiConfigPage";
import { api } from "../../../axios/api";
import { i18nDefault } from "../../../contexts/app-context/states/translation-state";
import de from "../../../../public/translations/de.json";
import zh from "../../../../public/translations/zh.json";

jest.mock("../../../axios/api", () => ({
  api: { systemPortal: { listAiConfigs: jest.fn(), createAiConfig: jest.fn(), updateAiConfig: jest.fn() } },
}));

const mockSetFeedback = jest.fn();
// Stable references, so the page's load effect runs once per mount.
const mockTranslation = { getText: (key: string) => key, i18nKeys: new Proxy({}, { get: (_t, key) => key }) };
const mockClearFeedback = jest.fn();
const mockGetFeedback = jest.fn();
const mockFeedback = { setFeedback: mockSetFeedback, clearFeedback: mockClearFeedback, getFeedback: mockGetFeedback };
jest.mock("../../../contexts", () => ({
  useTranslation: () => mockTranslation,
  useFeedback: () => mockFeedback,
}));

const listAiConfigs = api.systemPortal.listAiConfigs as jest.Mock;

beforeEach(() => {
  listAiConfigs.mockReset();
  mockSetFeedback.mockReset();
  mockClearFeedback.mockReset();
  mockGetFeedback.mockReset();
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
    apiKey: "***REDACTED***",
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
    const items = screen.getAllByRole("listitem");
    expect(items.map((li) => within(li).getByText(/^(Active|Zulu|Beta)$/).textContent)).toEqual([
      "Active",
      "Beta",
      "Zulu",
    ]);
    expect(listAiConfigs).toHaveBeenCalledTimes(1);
  });
});

describe("AI configuration translations", () => {
  const keys = Object.keys(i18nDefault.default).filter((key) => key.includes("AI_CONFIG"));

  it.each(keys)("%s exists in de and zh", (key) => {
    expect((de as Record<string, string>)[key]).toBeTruthy();
    expect((zh as Record<string, string>)[key]).toBeTruthy();
  });
});
