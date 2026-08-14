import { beforeEach, describe, expect, test } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../test/render";
import { initialState } from "../Context/ConceptMappingContext";
import { ACTION_TYPES } from "../Context/reducers";
import { StepFlow } from "./StepFlow";
import { api } from "../axios/api";

vi.mock("../axios/api", () => ({
  api: {
    terminology: { getStandardConcepts: vi.fn().mockResolvedValue([]), getAllFilterOptions: vi.fn() },
    conceptMappingSuggestions: {
      getSuggestions: vi.fn().mockResolvedValue([]),
      clearSuggestions: vi.fn().mockResolvedValue(undefined),
    },
  },
}));
import { vi } from "vitest";

const getSuggestions = api.conceptMappingSuggestions.getSuggestions as ReturnType<typeof vi.fn>;
const clearSuggestions = api.conceptMappingSuggestions.clearSuggestions as ReturnType<typeof vi.fn>;

const datasets = [{ id: "ds-1", studyDetail: { name: "Demo" }, databaseCode: "db", schemaName: "s" } as any];

describe("StepFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSuggestions.mockResolvedValue([]);
    clearSuggestions.mockResolvedValue(undefined);
  });

  test("Next is disabled on step 1 until source + dataset chosen", () => {
    renderWithProviders(<StepFlow datasets={datasets} selectedDatasetId="ds-1" />, { state: initialState });
    const next = screen.getByRole("button", { name: /Next/i });
    expect(next).toBeDisabled();
  });

  test("Next is enabled when step 1 requirements met", () => {
    const state = {
      ...initialState,
      wizard: { ...initialState.wizard, datasetId: "ds-1", sourceData: { type: "csv" as const, columns: ["a"] } },
    };
    renderWithProviders(<StepFlow datasets={datasets} selectedDatasetId="ds-1" />, { state });
    expect(screen.getByRole("button", { name: /Next/i })).toBeEnabled();
  });

  // Fix round 1 (reset-confirm dialog removal): a genuine source connection must reset
  // downstream state atomically (no cancelable dialog) and, when there was downstream work
  // worth clearing, surface a non-blocking notice via the feedback Snackbar instead.
  test("a genuine source connection resets downstream atomically and shows a feedback notice", () => {
    const sourceNode = { name: "SQL Node", type: "sql_node", description: "" };
    const state = {
      ...initialState,
      columnMapping: { ...initialState.columnMapping, sourceCode: "code" },
    };
    const { dispatch } = renderWithProviders(
      <StepFlow sourceNode={sourceNode} datasets={datasets} selectedDatasetId="ds-1" />,
      { state }
    );

    expect(dispatch).toHaveBeenCalledWith({ type: ACTION_TYPES.RESET_DOWNSTREAM });
    expect(
      dispatch.mock.calls.some(
        (call: any[]) => call[0]?.type === ACTION_TYPES.SET_FEEDBACK && typeof call[0]?.payload?.message === "string"
      )
    ).toBe(true);
  });

  test("a no-op source population (no prior downstream work) resets silently without a feedback notice", () => {
    const sourceNode = { name: "SQL Node", type: "sql_node", description: "" };
    const { dispatch } = renderWithProviders(
      <StepFlow sourceNode={sourceNode} datasets={datasets} selectedDatasetId="ds-1" />,
      { state: initialState }
    );

    expect(dispatch).toHaveBeenCalledWith({ type: ACTION_TYPES.RESET_DOWNSTREAM });
    expect(dispatch.mock.calls.some((call: any[]) => call[0]?.type === ACTION_TYPES.SET_FEEDBACK)).toBe(false);
  });

  test("resetting downstream also clears backend suggestions when dataflowId and nodeId are present", async () => {
    const sourceNode = { name: "SQL Node", type: "sql_node", description: "" };
    renderWithProviders(
      <StepFlow
        sourceNode={sourceNode}
        datasets={datasets}
        selectedDatasetId="ds-1"
        dataflowId="df-1"
        nodeId="node-1"
      />,
      { state: initialState }
    );

    await waitFor(() => expect(clearSuggestions).toHaveBeenCalledWith("df-1", "node-1"));
  });

  test("resetting downstream does not call clearSuggestions when dataflowId/nodeId are missing", () => {
    const sourceNode = { name: "SQL Node", type: "sql_node", description: "" };
    renderWithProviders(<StepFlow sourceNode={sourceNode} datasets={datasets} selectedDatasetId="ds-1" />, {
      state: initialState,
    });

    expect(clearSuggestions).not.toHaveBeenCalled();
  });

  test("no MUI Stepper is rendered on any step (the 3-step stepper was removed)", () => {
    for (const currentStep of [0, 1, 2]) {
      const state = { ...initialState, wizard: { ...initialState.wizard, currentStep } };
      const { unmount } = renderWithProviders(<StepFlow datasets={datasets} selectedDatasetId="ds-1" />, {
        state,
      });
      expect(document.querySelector(".MuiStepper-root")).not.toBeInTheDocument();
      unmount();
    }
  });

  test("the back icon button is hidden on step 0", () => {
    renderWithProviders(<StepFlow datasets={datasets} selectedDatasetId="ds-1" />, { state: initialState });
    expect(screen.queryByRole("button", { name: /Back/i })).not.toBeInTheDocument();
  });

  test("the back icon button is shown on step 1 and step 2 and navigates back one step", () => {
    const state = { ...initialState, wizard: { ...initialState.wizard, currentStep: 1 } };
    const { dispatch } = renderWithProviders(<StepFlow datasets={datasets} selectedDatasetId="ds-1" />, {
      state,
    });
    const back = screen.getByRole("button", { name: /Back/i });
    expect(back).toBeInTheDocument();

    fireEvent.click(back);
    expect(dispatch).toHaveBeenCalledWith({ type: ACTION_TYPES.SET_WIZARD_STEP, payload: 0 });
  });

  test("advancing from step 0 to step 1 marks mapping as started", () => {
    const state = {
      ...initialState,
      wizard: { ...initialState.wizard, datasetId: "ds-1", sourceData: { type: "csv" as const, columns: ["a"] } },
    };
    const { dispatch } = renderWithProviders(
      <StepFlow datasets={datasets} selectedDatasetId="ds-1" />,
      { state }
    );

    fireEvent.click(screen.getByRole("button", { name: /Next/i }));

    expect(dispatch).toHaveBeenCalledWith({ type: ACTION_TYPES.SET_MAPPING_STARTED, payload: true });
    expect(dispatch).toHaveBeenCalledWith({ type: ACTION_TYPES.SET_WIZARD_STEP, payload: 1 });
  });

  test("step 2 (last step) shows a Save button (not Next) that calls onSaveAndClose", () => {
    const onSaveAndClose = vi.fn();
    const state = { ...initialState, wizard: { ...initialState.wizard, currentStep: 2 } };
    renderWithProviders(
      <StepFlow datasets={datasets} selectedDatasetId="ds-1" onSaveAndClose={onSaveAndClose} />,
      { state }
    );

    expect(screen.queryByRole("button", { name: /^Next$/i })).not.toBeInTheDocument();
    const save = screen.getByRole("button", { name: /Save/i });
    fireEvent.click(save);
    expect(onSaveAndClose).toHaveBeenCalledTimes(1);
  });

  test("step 2 shows a Download as CSV button next to Save, disabled when there are no approved rows", () => {
    const state = { ...initialState, wizard: { ...initialState.wizard, currentStep: 2 } };
    renderWithProviders(<StepFlow datasets={datasets} selectedDatasetId="ds-1" />, { state });

    expect(screen.getByRole("button", { name: /Save/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download as CSV/i })).toBeDisabled();
  });

  // Approved/flagged status is now derived from the backend suggestions list (Task 10),
  // not the local `status` field, so this needs a dataflowId/nodeId + a matching backend
  // row with an approved suggestion for the CSV button to consider the row approved.
  test("step 2's Download as CSV button is enabled when an approved, unflagged row exists", async () => {
    getSuggestions.mockResolvedValue([
      { sourceRowId: "r1", flagged: false, suggestions: [{ id: "s1", isApproved: true }] },
    ]);
    const state = {
      ...initialState,
      wizard: { ...initialState.wizard, currentStep: 2 },
      columnMapping: { sourceCode: "code", sourceName: "name", sourceFrequency: "", description: "" },
      csvData: {
        name: "x",
        columns: ["code", "name"],
        data: [
          {
            status: "unchecked" as const,
            conceptId: 1,
            conceptName: "Aspirin",
            domainId: "Drug",
            system: "",
            validStartDate: "",
            validEndDate: "",
            validity: null,
            code: "A1",
            name: "Aspirin",
            sourceRowId: "r1",
          },
        ],
      },
    };
    renderWithProviders(
      <StepFlow datasets={datasets} selectedDatasetId="ds-1" dataflowId="df-1" nodeId="node-1" />,
      { state }
    );

    await waitFor(() => expect(screen.getByRole("button", { name: /Download as CSV/i })).toBeEnabled());
  });

  test("steps 0 and 1 still show Next (not Save)", () => {
    for (const currentStep of [0, 1]) {
      const state = { ...initialState, wizard: { ...initialState.wizard, currentStep } };
      const { unmount } = renderWithProviders(<StepFlow datasets={datasets} selectedDatasetId="ds-1" />, {
        state,
      });
      expect(screen.getByRole("button", { name: /^Next$/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^Save$/i })).not.toBeInTheDocument();
      unmount();
    }
  });
});
