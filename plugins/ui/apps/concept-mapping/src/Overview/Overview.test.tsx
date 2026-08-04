import { describe, expect, test, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../test/render";
import { initialState } from "../Context/ConceptMappingContext";
import { ACTION_TYPES } from "../Context/reducers";
import { ConceptMappingState } from "../types";

// Keep the Overview render light: stub the portal primitives and the heavy child tree so
// these tests exercise Overview's own wiring (rehydrate + dataset unification) in isolation.
vi.mock("@portal/components", () => ({
  Snackbar: () => null,
}));

vi.mock("../axios/api", () => ({
  api: {
    systemPortal: { getDatasets: vi.fn() },
  },
}));

vi.mock("../Wizard/WizardStepper", () => ({ WizardStepper: () => <div data-testid="wizard-stepper" /> }));

import { Overview } from "./Overview";
import { api } from "../axios/api";

const getDatasets = api.systemPortal.getDatasets as ReturnType<typeof vi.fn>;

const datasets = [
  { id: "ds-A", databaseCode: "dbA", schemaName: "sA", studyDetail: { name: "Dataset A" } },
  { id: "ds-B", databaseCode: "dbB", schemaName: "sB", studyDetail: { name: "Dataset B" } },
];

describe("Overview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDatasets.mockResolvedValue([]);
  });

  test("rehydrates the wizard slice from persisted data on reopen", async () => {
    const data: ConceptMappingState = {
      ...initialState,
      columnMapping: { sourceCode: "code", sourceName: "name", sourceFrequency: "", description: "" },
      csvData: {
        name: "codes.csv",
        columns: ["code", "name"],
        data: [{ code: "A1", name: "Aspirin", status: "unchecked" } as any],
      },
      wizard: {
        currentStep: 2,
        sourceType: "csv",
        sourceData: { type: "csv", name: "codes.csv", columns: ["code", "name"], rows: [{ code: "A1", name: "Aspirin" }] },
        datasetId: "ds-B",
        loadRecommendationByDefault: true,
        mappingStarted: true,
      },
    };

    const { dispatch } = renderWithProviders(<Overview data={data} />);
    await screen.findByTestId("wizard-stepper");

    const actions = dispatch.mock.calls.map((c: any[]) => c[0]);
    expect(actions).toContainEqual({ type: ACTION_TYPES.SET_SOURCE_DATA, payload: data.wizard.sourceData });
    expect(actions).toContainEqual({ type: ACTION_TYPES.SET_DATASET_ID, payload: "ds-B" });
    expect(actions).toContainEqual({ type: ACTION_TYPES.SET_LOAD_RECOMMENDATION, payload: true });
  });

  test("renders the wizard directly with no tab menu (no Configuration/Saved-mappings tabs, no dataset dropdown)", async () => {
    getDatasets.mockResolvedValue(datasets);
    renderWithProviders(<Overview />);
    await screen.findByTestId("wizard-stepper");
    // No tab menu and no header dataset selector remain - the wizard is rendered directly and
    // Step 1 (mocked away here) is the only dataset selector.
    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.queryByRole("combobox")).toBeNull();
  });
});
