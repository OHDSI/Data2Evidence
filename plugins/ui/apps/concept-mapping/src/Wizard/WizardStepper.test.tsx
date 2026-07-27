import { describe, expect, test } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../test/render";
import { initialState } from "../Context/ConceptMappingContext";
import { ACTION_TYPES } from "../Context/reducers";
import { WizardStepper } from "./WizardStepper";

vi.mock("../axios/api", () => ({
  api: { terminology: { getStandardConcepts: vi.fn().mockResolvedValue([]), getAllFilterOptions: vi.fn() } },
}));
import { vi } from "vitest";

const datasets = [{ id: "ds-1", studyDetail: { name: "Demo" }, databaseCode: "db", schemaName: "s" } as any];

describe("WizardStepper", () => {
  test("Next is disabled on step 1 until source + dataset chosen", () => {
    renderWithProviders(<WizardStepper datasets={datasets} selectedDatasetId="ds-1" />, { state: initialState });
    const next = screen.getByRole("button", { name: /Next/i });
    expect(next).toBeDisabled();
  });

  test("Next is enabled when step 1 requirements met", () => {
    const state = {
      ...initialState,
      wizard: { ...initialState.wizard, datasetId: "ds-1", sourceData: { type: "csv" as const, columns: ["a"] } },
    };
    renderWithProviders(<WizardStepper datasets={datasets} selectedDatasetId="ds-1" />, { state });
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
      <WizardStepper sourceNode={sourceNode} datasets={datasets} selectedDatasetId="ds-1" />,
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
      <WizardStepper sourceNode={sourceNode} datasets={datasets} selectedDatasetId="ds-1" />,
      { state: initialState }
    );

    expect(dispatch).toHaveBeenCalledWith({ type: ACTION_TYPES.RESET_DOWNSTREAM });
    expect(dispatch.mock.calls.some((call: any[]) => call[0]?.type === ACTION_TYPES.SET_FEEDBACK)).toBe(false);
  });
});
