import { describe, expect, test } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../test/render";
import { initialState } from "../Context/ConceptMappingContext";
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
});
