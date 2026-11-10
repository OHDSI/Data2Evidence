import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AiConfigPage } from "./AiConfigPage";
import { api } from "../../../axios/api";
import { i18nDefault } from "../../../contexts/app-context/states/translation-state";
import de from "../../../../public/translations/de.json";
import zh from "../../../../public/translations/zh.json";

jest.mock("../../../axios/api", () => ({ api: { systemPortal: { listAiConfigs: jest.fn(), createAiConfig: jest.fn() } } }));

const mockSetFeedback = jest.fn();
// Stable references, so the page's load effect runs once per mount.
const mockTranslation = { getText: (key: string) => key, i18nKeys: new Proxy({}, { get: (_t, key) => key }) };
const mockFeedback = { setFeedback: mockSetFeedback };
jest.mock("../../../contexts", () => ({
  useTranslation: () => mockTranslation,
  useFeedback: () => mockFeedback,
}));

const listAiConfigs = api.systemPortal.listAiConfigs as jest.Mock;

beforeEach(() => {
  listAiConfigs.mockReset();
  mockSetFeedback.mockReset();
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
      expect(mockSetFeedback).toHaveBeenCalledWith({ type: "error", message: "AI_CONFIG__LOAD_ERROR" })
    );
  });
});

describe("AI configuration translations", () => {
  const keys = Object.keys(i18nDefault.default).filter((key) => key.includes("AI_CONFIG"));

  it.each(keys)("%s exists in de and zh", (key) => {
    expect((de as Record<string, string>)[key]).toBeTruthy();
    expect((zh as Record<string, string>)[key]).toBeTruthy();
  });
});
