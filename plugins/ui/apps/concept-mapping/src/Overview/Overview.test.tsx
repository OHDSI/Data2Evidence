import { describe, expect, test, vi, beforeEach } from "vitest";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../test/render";
import { initialState } from "../Context/ConceptMappingContext";
import { ACTION_TYPES } from "../Context/reducers";
import { ConceptMappingState } from "../types";

// Keep the Overview render light: stub the portal primitives and the heavy child trees so
// these tests exercise Overview's own wiring (rehydrate + dataset unification) in isolation.
vi.mock("@portal/components", () => ({
  Snackbar: () => null,
  Button: (props: any) => (
    <button data-testid="save-button" onClick={props.onClick} disabled={props.disabled}>
      {props.text}
    </button>
  ),
}));

vi.mock("../axios/api", () => ({
  api: {
    systemPortal: { getDatasets: vi.fn() },
    conceptMapping: { saveConceptMappings: vi.fn().mockResolvedValue(undefined) },
  },
}));

vi.mock("../Wizard/WizardStepper", () => ({ WizardStepper: () => <div data-testid="wizard-stepper" /> }));
vi.mock("../components/SavedMappingsTable/SavedMappingsTable", () => ({ SavedMappingsTable: () => null }));

import { Overview } from "./Overview";
import { api } from "../axios/api";

const getDatasets = api.systemPortal.getDatasets as ReturnType<typeof vi.fn>;
const saveConceptMappings = api.conceptMapping.saveConceptMappings as ReturnType<typeof vi.fn>;

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

  test("header has no dataset dropdown - Step 1 is the single dataset selector", async () => {
    getDatasets.mockResolvedValue(datasets);
    renderWithProviders(<Overview />);
    await screen.findByTestId("wizard-stepper");
    // Overview's header no longer renders its own dataset <Select> (the only selector now
    // lives in Step 1, which is mocked away here). So no combobox should be present.
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  test("Save uses the Step-1-selected dataset (wizard.datasetId), not a header default", async () => {
    getDatasets.mockResolvedValue(datasets);
    // wizard.datasetId points at Dataset B; header previously defaulted to datasets[0] (A).
    const state: ConceptMappingState = {
      ...initialState,
      columnMapping: { sourceCode: "code", sourceName: "name", sourceFrequency: "", description: "" },
      csvData: {
        name: "codes.csv",
        columns: ["code", "name"],
        data: [
          {
            code: "A1",
            name: "Aspirin",
            status: "checked",
            conceptId: 42,
            conceptName: "Aspirin",
            domainId: "Drug",
            system: "RxNorm",
            validStartDate: "2000-01-01",
            validEndDate: "2099-12-31",
            validity: "",
          } as any,
        ],
      },
      wizard: { ...initialState.wizard, datasetId: "ds-B", sourceType: "csv" },
    };

    renderWithProviders(<Overview />, { state });

    const saveButton = await screen.findByTestId("save-button");
    await waitFor(() => expect(saveButton).not.toBeDisabled());
    // Wrap in act(async) so the async save (setIsSaving true -> await -> finally false)
    // fully flushes inside the test, keeping the suite free of act() warnings.
    await act(async () => {
      fireEvent.click(saveButton);
    });

    await waitFor(() => expect(saveConceptMappings).toHaveBeenCalledTimes(1));
    // databaseCode "dbB" / schemaName "sB" come from Dataset B, proving the Step 1 choice
    // (not the old header default of Dataset A) drives Save.
    expect(saveConceptMappings.mock.calls[0][0]).toBe("dbB");
    expect(saveConceptMappings.mock.calls[0][1]).toBe("sB");
  });
});
