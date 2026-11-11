import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Feature } from "./Feature";
import { api } from "../../../axios/api";

jest.mock("../../../axios/api", () => ({
  api: { systemPortal: { listAiConfigs: jest.fn(), setFeatures: jest.fn() } },
}));

// The real checkbox is a web component that jsdom cannot drive; a native input stands in for it.
jest.mock("@portal/components", () => ({
  ...jest.requireActual("@portal/components"),
  Checkbox: ({ checked, label, onChange }: any) => (
    <label>
      {label}
      <input type="checkbox" checked={checked} onChange={onChange} />
    </label>
  ),
}));

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  useLocation: () => ({ pathname: "/setup" }),
  useNavigate: () => mockNavigate,
}));

const mockInvalidate = jest.fn();
const FEATURES = [
  { feature: "pythia", name: "Pythia", isEnabled: false },
  { feature: "atlas", name: "Atlas", isEnabled: false },
  { feature: "cohort", name: "Cohort", isEnabled: false },
];
jest.mock("../../../hooks", () => ({
  useFeatures: () => [mockFeatures, false, undefined],
  invalidateFeatures: () => mockInvalidate(),
}));
let mockFeatures: typeof FEATURES;

const mockSetFeedback = jest.fn();
const mockTranslation = { getText: (key: string) => key, i18nKeys: new Proxy({}, { get: (_t, k) => k }) };
jest.mock("../../../contexts", () => ({
  useTranslation: () => mockTranslation,
  useFeedback: () => ({ setFeedback: mockSetFeedback }),
}));

const listAiConfigs = api.systemPortal.listAiConfigs as jest.Mock;
const setFeatures = api.systemPortal.setFeatures as jest.Mock;
const box = (name: string) => screen.getByRole("checkbox", { name, hidden: true }) as HTMLInputElement;
const save = () => fireEvent.click(screen.getByText("FEATURE__SAVE"));

beforeEach(() => {
  jest.clearAllMocks();
  // Fresh objects per test: the page sorts the array it is given.
  mockFeatures = FEATURES.map((f) => ({ ...f }));
  setFeatures.mockResolvedValue(undefined);
});

describe("Feature flags page", () => {
  it("shows the popup and leaves Pythia unticked when there is no configuration", async () => {
    listAiConfigs.mockResolvedValue([]);
    render(<Feature />);
    fireEvent.click(box("Pythia"));
    expect(await screen.findByText("FEATURE__NO_AI_CONFIG_TITLE")).toBeInTheDocument();
    expect(box("Pythia").checked).toBe(false);

    fireEvent.click(screen.getByText("FEATURE__NO_AI_CONFIG_CANCEL"));
    await waitFor(() => expect(screen.queryByText("FEATURE__NO_AI_CONFIG_TITLE")).not.toBeInTheDocument());
    expect(box("Pythia").checked).toBe(false);
  });

  it("closes the popup with the close button and leaves Pythia unticked", async () => {
    listAiConfigs.mockResolvedValue([]);
    render(<Feature />);
    fireEvent.click(box("Pythia"));
    await screen.findByText("FEATURE__NO_AI_CONFIG_TITLE");
    fireEvent.click(screen.getByLabelText("AI_CONFIG__CLOSE"));
    await waitFor(() => expect(screen.queryByText("FEATURE__NO_AI_CONFIG_TITLE")).not.toBeInTheDocument());
    expect(box("Pythia").checked).toBe(false);
  });

  it("ticks Pythia with no popup when a configuration exists", async () => {
    listAiConfigs.mockResolvedValue([{ id: 1 }]);
    render(<Feature />);
    fireEvent.click(box("Pythia"));
    await waitFor(() => expect(box("Pythia").checked).toBe(true));
    expect(screen.queryByText("FEATURE__NO_AI_CONFIG_TITLE")).not.toBeInTheDocument();
  });

  it("fails closed with an error toast and no popup when the check rejects", async () => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    listAiConfigs.mockRejectedValue(new Error("boom"));
    render(<Feature />);
    fireEvent.click(box("Pythia"));
    await waitFor(() =>
      expect(mockSetFeedback).toHaveBeenCalledWith({ type: "error", message: "FEATURE__AI_CONFIG_CHECK_ERROR" })
    );
    expect(box("Pythia").checked).toBe(false);
    expect(screen.queryByText("FEATURE__NO_AI_CONFIG_TITLE")).not.toBeInTheDocument();
  });

  it("makes no check when unticking Pythia or ticking another flag", async () => {
    listAiConfigs.mockResolvedValue([{ id: 1 }]);
    render(<Feature />);
    fireEvent.click(box("Pythia"));
    await waitFor(() => expect(box("Pythia").checked).toBe(true));
    listAiConfigs.mockClear();
    fireEvent.click(box("Pythia"));
    fireEvent.click(box("Atlas"));
    await waitFor(() => expect(box("Atlas").checked).toBe(true));
    expect(box("Pythia").checked).toBe(false);
    expect(listAiConfigs).not.toHaveBeenCalled();
  });

  it("sends only the changed flags on save, and nothing when nothing changed", async () => {
    render(<Feature />);
    save();
    await waitFor(() => expect(mockSetFeedback).toHaveBeenCalledWith(expect.objectContaining({ type: "success" })));
    expect(setFeatures).not.toHaveBeenCalled();

    fireEvent.click(box("Atlas"));
    save();
    await waitFor(() => expect(setFeatures).toHaveBeenCalledTimes(1));
    expect(setFeatures).toHaveBeenCalledWith([{ feature: "atlas", name: "Atlas", isEnabled: true }]);
  });

  it.each([["Atlas", "atlas", false], ["Pythia", "pythia", true]])(
    "sends %s as off when it is ticked, saved, unticked and saved again",
    async (label, feature, needsConfig) => {
      if (needsConfig) listAiConfigs.mockResolvedValue([{ id: 1 }]);
      render(<Feature />);
      fireEvent.click(box(label));
      await waitFor(() => expect(box(label).checked).toBe(true));
      save();
      await waitFor(() => expect(setFeatures).toHaveBeenCalledTimes(1));
      expect(setFeatures.mock.calls[0][0]).toEqual([expect.objectContaining({ feature, isEnabled: true })]);

      await waitFor(() => expect(mockInvalidate).toHaveBeenCalled());
      fireEvent.click(box(label));
      await waitFor(() => expect(box(label).checked).toBe(false));
      save();
      await waitFor(() => expect(setFeatures).toHaveBeenCalledTimes(2));
      expect(setFeatures.mock.calls[1][0]).toEqual([expect.objectContaining({ feature, isEnabled: false })]);
    }
  );

  it("keeps a tick made on another box while the Pythia check is pending", async () => {
    let resolve!: (rows: unknown[]) => void;
    listAiConfigs.mockReturnValue(new Promise((r) => (resolve = r)));
    render(<Feature />);
    fireEvent.click(box("Pythia"));
    fireEvent.click(box("Atlas"));
    await act(async () => resolve([{ id: 1 }]));
    expect(box("Pythia").checked).toBe(true);
    expect(box("Atlas").checked).toBe(true);
  });

  it("navigates to the AI configuration page with Add open, and writes no flag", async () => {
    listAiConfigs.mockResolvedValue([]);
    render(<Feature />);
    fireEvent.click(box("Pythia"));
    fireEvent.click(await screen.findByText("FEATURE__NO_AI_CONFIG_GO"));
    expect(mockNavigate).toHaveBeenCalledWith("/setup", {
      state: { tab: "setup", subTab: "ai-config", openAdd: true },
    });
    expect(setFeatures).not.toHaveBeenCalled();
  });
});
