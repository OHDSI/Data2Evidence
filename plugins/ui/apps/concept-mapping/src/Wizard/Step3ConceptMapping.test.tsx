import { beforeEach, describe, expect, test, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../test/render";
import { ConceptMappingContext, ConceptMappingDispatchContext, initialState } from "../Context/ConceptMappingContext";
import { Step3ConceptMapping } from "./Step3ConceptMapping";
import { api } from "../axios/api";

vi.mock("../axios/api", () => ({
  api: { terminology: { getStandardConcepts: vi.fn().mockResolvedValue([]), getAllFilterOptions: vi.fn() } },
}));

const getStandardConcepts = api.terminology.getStandardConcepts as ReturnType<typeof vi.fn>;

describe("Step3ConceptMapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getStandardConcepts.mockResolvedValue([]);
  });

  test("renders the mapping table toolbar", () => {
    renderWithProviders(<Step3ConceptMapping selectedDatasetId="ds-1" />);
    expect(screen.getByText(/Populate concepts/i)).toBeInTheDocument();
  });

  test("fires populate once when autoPopulate is true and rows are available", async () => {
    const state = {
      ...initialState,
      wizard: { ...initialState.wizard, loadRecommendationByDefault: true },
      columnMapping: { sourceCode: "code", sourceName: "name", sourceFrequency: "freq", description: "desc" },
      csvData: {
        name: "x",
        columns: ["code", "name"],
        data: [
          {
            code: "1",
            name: "foo",
            status: "pending",
            conceptId: 0,
            conceptName: "",
            domainId: "",
            system: "",
            validStartDate: "",
            validEndDate: "",
            validity: null,
          },
        ],
      },
    };

    const { dispatch, rerender } = renderWithProviders(<Step3ConceptMapping selectedDatasetId="ds-1" />, { state });

    await waitFor(() => expect(getStandardConcepts).toHaveBeenCalledTimes(1));

    // Force a couple of re-renders (through the same providers) to prove the
    // effect only ever fires once, even once the component re-renders again.
    const wrapped = (
      <ConceptMappingContext.Provider value={state}>
        <ConceptMappingDispatchContext.Provider value={dispatch}>
          <Step3ConceptMapping selectedDatasetId="ds-1" />
        </ConceptMappingDispatchContext.Provider>
      </ConceptMappingContext.Provider>
    );
    rerender(wrapped);
    rerender(wrapped);

    await waitFor(() => expect(getStandardConcepts).toHaveBeenCalledTimes(1));
  });

  test("does not fire populate when autoPopulate is false", async () => {
    renderWithProviders(<Step3ConceptMapping selectedDatasetId="ds-1" />);

    await screen.findByText(/Populate concepts/i);
    expect(getStandardConcepts).toHaveBeenCalledTimes(0);
  });

  test("does not fire populate when autoPopulate is true but there are no available rows", async () => {
    const state = {
      ...initialState,
      wizard: { ...initialState.wizard, loadRecommendationByDefault: true },
    };

    renderWithProviders(<Step3ConceptMapping selectedDatasetId="ds-1" />, { state });

    await screen.findByText(/Populate concepts/i);
    expect(getStandardConcepts).toHaveBeenCalledTimes(0);
  });
});
