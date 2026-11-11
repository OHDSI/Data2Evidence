import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AiConfigDialog } from "./AiConfigDialog";
import { api } from "../../../axios/api";
import { i18nDefault } from "../../../contexts/app-context/states/translation-state";
import { AiConfig } from "../../../types/aiConfig";

jest.mock("../../../axios/api", () => ({
  api: { systemPortal: { createAiConfig: jest.fn(), updateAiConfig: jest.fn() } },
}));

// Real English strings, and a key map with only the real keys, so an unknown error code is unknown here too.
const strings = i18nDefault.default as Record<string, string>;
const mockTranslation = {
  getText: (key: string) => strings[key] ?? key,
  i18nKeys: Object.fromEntries(Object.keys(strings).map((key) => [key, key])),
};
jest.mock("../../../contexts", () => ({ useTranslation: () => mockTranslation }));

const createAiConfig = api.systemPortal.createAiConfig as jest.Mock;
const updateAiConfig = api.systemPortal.updateAiConfig as jest.Mock;

const saved: AiConfig = {
  id: 1,
  name: "Saved",
  provider: "bedrock",
  model: "m",
  baseUrl: null,
  region: "us-east-2",
  workspaceId: null,
  apiKey: "***REDACTED***",
  isActive: true,
};
const existing: AiConfig = {
  ...saved,
  id: 7,
  name: "Prod",
  provider: "openai-compatible",
  model: "gpt-4o",
  baseUrl: "https://llm.example.org/v1",
  region: null,
  isActive: false,
};

const GENERIC = "Couldn't save the configuration. Your entries are preserved. Check your connection and try again.";

const onClose = jest.fn();
const onSaved = jest.fn();

const open = (config?: AiConfig) => render(<AiConfigDialog config={config} onClose={onClose} onSaved={onSaved} />);
const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const saveButton = () => screen.getByRole("button", { name: "Save configuration" });
const sectionLabels = () =>
  Array.from(document.querySelectorAll(".ai-config-dialog__section label")).map((label) => label.textContent);

async function chooseProvider(label: string) {
  await userEvent.click(screen.getByRole("combobox"));
  await userEvent.click(await screen.findByRole("option", { name: label }));
}

async function fill(label: string, value: string) {
  const input = field(label);
  await userEvent.clear(input);
  await userEvent.type(input, value);
}

beforeEach(() => {
  createAiConfig.mockReset().mockResolvedValue(saved);
  updateAiConfig.mockReset().mockResolvedValue(saved);
  onClose.mockReset();
  onSaved.mockReset();
});

describe("AiConfigDialog add", () => {
  it("prefills the name and asks for a provider first", () => {
    open();

    expect(screen.getByRole("heading", { name: "Add AI configuration" })).toBeInTheDocument();
    expect(field("Configuration name").value).toBe("AI Configuration 1");
    expect(screen.getByText(/Choose a provider first/)).toBeInTheDocument();
    expect(sectionLabels()).toEqual([]);
    expect(saveButton()).toBeDisabled();
  });

  it.each([
    ["OpenAI-compatible", ["Base URL", "API key", "Model"]],
    ["Anthropic API", ["Anthropic API key", "Model", "Anthropic Workspace ID"]],
    ["AWS Bedrock", ["Bedrock API key", "Region", "Model"]],
  ])("%s shows its fields in order with one Model field", async (provider, labels) => {
    open();

    await chooseProvider(provider);

    expect(sectionLabels()).toEqual(labels);
    expect(sectionLabels().filter((label) => label === "Model")).toHaveLength(1);
  });

  it.each([
    ["OpenAI-compatible", { "Base URL": "https://llm.example.org/v1", "API key": "k", Model: "m" }],
    ["Anthropic API", { "Anthropic API key": "k", Model: "m" }],
    ["AWS Bedrock", { "Bedrock API key": "k", Region: "us-east-2", Model: "m" }],
  ])("%s enables Save only when every required field is filled", async (provider, values) => {
    open();
    await chooseProvider(provider);

    for (const [label, value] of Object.entries(values)) {
      expect(saveButton()).toBeDisabled();
      await fill(label, value);
    }

    expect(saveButton()).toBeEnabled();
  });

  it("rejects a base URL that is not http or https", async () => {
    open();
    await chooseProvider("OpenAI-compatible");
    await fill("API key", "k");
    await fill("Model", "m");

    await fill("Base URL", "ftp://llm.example.org");

    expect(screen.getByText("Enter a valid URL, such as https://llm.example.org/v1.")).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
    await fill("Base URL", "https://llm.example.org");
    expect(saveButton()).toBeEnabled();
  });

  it("sends the workspace ID only for Anthropic", async () => {
    open();
    await chooseProvider("Anthropic API");
    await fill("Anthropic API key", "k");
    await fill("Model", "m");
    await fill("Anthropic Workspace ID", "wrkspc_1");
    await chooseProvider("AWS Bedrock");
    await fill("Region", "us-east-2");

    await userEvent.click(saveButton());

    expect(createAiConfig).toHaveBeenCalledWith({
      name: "AI Configuration 1",
      provider: "bedrock",
      model: "m",
      apiKey: "k",
      region: "us-east-2",
    });

    await chooseProvider("Anthropic API");
    await userEvent.click(saveButton());
    expect(createAiConfig).toHaveBeenLastCalledWith({
      name: "AI Configuration 1",
      provider: "anthropic",
      model: "m",
      apiKey: "k",
      workspaceId: "wrkspc_1",
    });
  });

  it("is optional for Anthropic to leave the workspace ID empty", async () => {
    open();
    await chooseProvider("Anthropic API");
    await fill("Anthropic API key", "k");
    await fill("Model", "m");

    await userEvent.click(saveButton());

    expect(createAiConfig).toHaveBeenCalledWith(expect.objectContaining({ provider: "anthropic", workspaceId: null }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved));
  });

  it("keeps values when the provider is switched", async () => {
    open();
    await chooseProvider("AWS Bedrock");
    await fill("Bedrock API key", "secret");
    await fill("Model", "m");
    await fill("Region", "eu-west-1");

    await chooseProvider("Anthropic API");
    expect(field("Anthropic API key").value).toBe("secret");
    expect(field("Model").value).toBe("m");

    await chooseProvider("AWS Bedrock");
    expect(field("Region").value).toBe("eu-west-1");
  });

  it("exposes required fields to assistive tech and stops password autofill on the key", async () => {
    open();
    await chooseProvider("AWS Bedrock");

    expect(field("Configuration name")).toHaveAttribute("aria-required", "true");
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-required", "true");
    expect(field("Bedrock API key")).toHaveAttribute("autocomplete", "new-password");
  });

  it("masks the key until the eye toggle is used", async () => {
    open();
    await chooseProvider("AWS Bedrock");

    expect(field("Bedrock API key").type).toBe("password");
    await userEvent.click(screen.getByRole("button", { name: "Show API key" }));
    expect(field("Bedrock API key").type).toBe("text");
  });

  it("closes without saving from Cancel and from the close button", async () => {
    open();

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await userEvent.click(screen.getByRole("button", { name: "Close dialog" }));

    expect(onClose).toHaveBeenCalledTimes(2);
    expect(createAiConfig).not.toHaveBeenCalled();
  });
});

describe("AiConfigDialog edit", () => {
  it("prefills the saved values with an empty masked key field and submits the placeholder when the key is untouched", async () => {
    open(existing);

    expect(screen.getByRole("heading", { name: "Edit AI configuration" })).toBeInTheDocument();
    expect(field("Configuration name").value).toBe("Prod");
    expect(field("API key").type).toBe("password");
    expect(field("API key").value).toBe("");
    expect(screen.getByText("Leave empty to keep the saved key.")).toBeInTheDocument();
    await fill("Model", "gpt-4.1");

    await userEvent.click(saveButton());

    expect(updateAiConfig).toHaveBeenCalledWith(7, {
      name: "Prod",
      provider: "openai-compatible",
      model: "gpt-4.1",
      apiKey: "***REDACTED***",
      baseUrl: "https://llm.example.org/v1",
    });
    expect(createAiConfig).not.toHaveBeenCalled();
  });

  it("does not submit the placeholder when the base URL changed", async () => {
    open(existing);

    await fill("Base URL", "https://other.example.org/v1");

    expect(field("API key").value).toBe("");
    expect(screen.getByText(/Enter the API key again/)).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
    await fill("API key", "new-key");
    await userEvent.click(saveButton());
    expect(updateAiConfig).toHaveBeenCalledWith(7, expect.objectContaining({ apiKey: "new-key" }));
  });

  it("does not submit the placeholder when the provider changed", async () => {
    open(existing);

    await chooseProvider("Anthropic API");

    expect(field("Anthropic API key").value).toBe("");
    expect(saveButton()).toBeDisabled();
  });

  it("sends exactly what is typed or pasted into the empty key field", async () => {
    open(existing);

    fireEvent.change(field("API key"), { target: { value: "sk-new" } });
    await userEvent.click(saveButton());

    expect(updateAiConfig).toHaveBeenCalledWith(7, expect.objectContaining({ apiKey: "sk-new" }));
  });

  it.each([
    ["name", "Configuration name", existing],
    ["region", "Region", { ...saved, id: 8 }],
  ])("keeps the saved key when only the %s changed", async (_what, label, config) => {
    open(config);

    await fill(label, "changed");
    await userEvent.click(saveButton());

    expect(updateAiConfig).toHaveBeenCalledWith(config.id, expect.objectContaining({ apiKey: "***REDACTED***" }));
  });

  it("restores the saved key when the base URL is changed back", async () => {
    open(existing);

    await fill("Base URL", "https://other.example.org/v1");
    expect(field("API key").value).toBe("");
    await fill("Base URL", "https://llm.example.org/v1");

    expect(screen.getByText("Leave empty to keep the saved key.")).toBeInTheDocument();
    expect(saveButton()).toBeEnabled();
  });

  it("keeps the saved key after a round trip through another provider", async () => {
    open({ ...existing, provider: "anthropic", baseUrl: null });

    await chooseProvider("OpenAI-compatible");
    await fill("Base URL", "https://llm.example.org/v1");
    expect(field("API key").value).toBe("");
    await chooseProvider("Anthropic API");

    expect(screen.getByText("Leave empty to keep the saved key.")).toBeInTheDocument();
    expect(saveButton()).toBeEnabled();
    await userEvent.click(saveButton());
    expect(updateAiConfig).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ provider: "anthropic", apiKey: "***REDACTED***" })
    );
  });

  it("shows a failed update's error and clears it on the next edit", async () => {
    updateAiConfig.mockRejectedValue({ status: 409, data: { code: "AI_CONFIG_DUPLICATE", field: "name" } });
    open(existing);

    await userEvent.click(saveButton());
    expect(await screen.findByText("This name is already in use. Choose a different name.")).toBeInTheDocument();

    await userEvent.type(field("Configuration name"), "x");
    expect(screen.queryByText("This name is already in use. Choose a different name.")).not.toBeInTheDocument();
  });

  it("never submits the placeholder when the saved key is unreadable", async () => {
    open({ ...existing, keyReadable: false });

    expect(field("API key").value).toBe("");
    expect(screen.getByText(/can no longer be read/)).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
    await fill("API key", "fresh");
    await userEvent.click(saveButton());
    expect(updateAiConfig).toHaveBeenCalledWith(7, expect.objectContaining({ apiKey: "fresh" }));
  });
});

describe("AiConfigDialog errors", () => {
  async function failSave(rejection: unknown) {
    createAiConfig.mockRejectedValue(rejection);
    open();
    await chooseProvider("AWS Bedrock");
    await fill("Bedrock API key", "sk-secret-key");
    await fill("Region", "us-east-2");
    await fill("Model", "m");
    await userEvent.click(saveButton());
  }

  it("shows a duplicate name inline on the name field and stays open", async () => {
    await failSave({ status: 409, data: { code: "AI_CONFIG_DUPLICATE", field: "name" } });

    const nameHelper = await screen.findByText("This name is already in use. Choose a different name.");
    expect(nameHelper.closest(".MuiFormControl-root")).toContainElement(field("Configuration name"));
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(saveButton()).toBeDisabled();
    await userEvent.type(field("Configuration name"), "x");
    expect(saveButton()).toBeEnabled();
  });

  it("shows an invalid value inline on the named field", async () => {
    await failSave({ status: 400, data: { code: "AI_CONFIG_INVALID", field: "region" } });

    const helper = await screen.findByText("This value is not valid.");
    expect(helper.closest(".MuiFormControl-root")).toContainElement(field("Region"));
    expect(saveButton()).toBeDisabled();
  });

  it("shows an invalid value for a field the provider does not have in the banner and keeps Save enabled", async () => {
    await failSave({ status: 400, data: { code: "AI_CONFIG_INVALID", field: "baseUrl" } });

    expect(await screen.findByText("This value is not valid.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Base URL")).not.toBeInTheDocument();
    expect(saveButton()).toBeEnabled();
  });

  it("shows a known code's string in the dialog", async () => {
    await failSave({ status: 400, data: { code: "AI_CONFIG_KEY_REQUIRED" } });

    expect(await screen.findByText("Enter the API key again.")).toBeInTheDocument();
    expect(saveButton()).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });

  it("keeps the normal Save label when the server has no encryption key", async () => {
    await failSave({ status: 500, data: { code: "AI_CONFIG_ENCRYPTION_KEY_NOT_CONFIGURED" } });

    expect(await screen.findByText(/no encryption key configured/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });

  it("shows the failure below the fields, keeps every value and re-sends the same body from Try again", async () => {
    await failSave("Network Error");

    const alert = await screen.findByText(GENERIC);
    const section = document.querySelector(".ai-config-dialog__section") as HTMLElement;
    expect(section.compareDocumentPosition(alert) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(field("Region").value).toBe("us-east-2");
    expect(field("Model").value).toBe("m");
    expect(field("Bedrock API key").value).toBe("sk-secret-key");

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(createAiConfig).toHaveBeenCalledTimes(2));
    expect(createAiConfig.mock.calls[1][0]).toEqual(createAiConfig.mock.calls[0][0]);
  });

  it.each([
    ["an unknown code", { status: 500, data: { code: "AI_CONFIG_SOMETHING_NEW", message: "raw backend text" } }],
    ["a plain message", "Network Error"],
  ])("shows the generic string for %s and never the raw message", async (_name, rejection) => {
    await failSave(rejection);

    expect(await screen.findByText(GENERIC)).toBeInTheDocument();
    expect(screen.queryByText("raw backend text")).not.toBeInTheDocument();
  });

  it("puts no API key into any console call when a save fails", async () => {
    const calls: unknown[][] = [];
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((method) =>
      jest.spyOn(console, method).mockImplementation((...args) => void calls.push(args))
    );
    try {
      await failSave({
        status: 400,
        data: { code: "AI_CONFIG_INVALID", field: "model" },
        config: { data: JSON.stringify({ apiKey: "sk-secret-key" }) },
      });
      await screen.findByText("This value is not valid.");

      expect(JSON.stringify(calls)).not.toContain("sk-secret-key");
    } finally {
      spies.forEach((spy) => spy.mockRestore());
    }
  });
});

describe("AiConfigDialog saving", () => {
  it("locks the dialog, shows the banner and sends one request however often the button is clicked", async () => {
    let resolve: (value: AiConfig) => void = () => undefined;
    updateAiConfig.mockReturnValue(new Promise<AiConfig>((r) => (resolve = r)));
    open(existing);

    const save = saveButton();
    fireEvent.click(save);
    fireEvent.click(save);

    expect(
      await screen.findByText("Saving configuration... Please wait before closing this dialog.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Saving\.\.\./ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
    for (const label of ["Configuration name", "Base URL", "Model"]) expect(field(label)).toBeDisabled();
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "Show API key" })).toBeDisabled();
    expect(updateAiConfig).toHaveBeenCalledTimes(1);

    resolve(saved);
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved));
  });

  it("closes through onNotFound instead of showing an error when an Edit finds the row deleted", async () => {
    const onNotFound = jest.fn();
    updateAiConfig.mockRejectedValue({ status: 404, data: { code: "AI_CONFIG_NOT_FOUND" } });
    render(<AiConfigDialog config={existing} onClose={onClose} onSaved={onSaved} onNotFound={onNotFound} />);

    await userEvent.click(saveButton());

    await waitFor(() => expect(onNotFound).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("This configuration no longer exists.")).not.toBeInTheDocument();
  });
});

describe("AiConfigDialog required messages", () => {
  it("shows no message on open, then one per touched empty required field", async () => {
    open();
    await chooseProvider("OpenAI-compatible");
    expect(screen.queryByText(/^Enter /)).not.toBeInTheDocument();

    for (const label of ["Base URL", "API key", "Model"]) {
      await userEvent.click(field(label));
      await userEvent.tab();
    }
    await userEvent.clear(field("Configuration name"));
    await userEvent.tab();

    expect(screen.getByText("Enter the provider's base URL.")).toBeInTheDocument();
    expect(screen.getByText("Enter an API key.")).toBeInTheDocument();
    expect(screen.getByText("Enter a model.")).toBeInTheDocument();
    expect(screen.getByText("Enter a configuration name.")).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it("shows the region message for Bedrock", async () => {
    open();
    await chooseProvider("AWS Bedrock");
    await userEvent.click(field("Region"));
    await userEvent.tab();

    expect(screen.getByText("Enter the AWS region.")).toBeInTheDocument();
  });

  it("gives Anthropic's optional Workspace ID no message", async () => {
    open();
    await chooseProvider("Anthropic API");
    await userEvent.click(field("Anthropic Workspace ID"));
    await userEvent.tab();

    expect(screen.queryByText(/^Enter /)).not.toBeInTheDocument();
  });

  it("does not ask for the API key on Edit while the stored key is kept", async () => {
    open(existing);
    await userEvent.click(field("API key"));
    await userEvent.tab();

    expect(screen.queryByText("Enter an API key.")).not.toBeInTheDocument();
  });
});
