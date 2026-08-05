import { beforeEach, describe, expect, test, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import { renderWithProviders } from "../../test/render";
import { initialState } from "../../Context/ConceptMappingContext";
import { MappingDrawer } from "./MappingDrawer";
import { api } from "../../axios/api";
import { TerminologyProps } from "../../types";

vi.mock("../../axios/api", () => ({
  api: {
    conceptMappingSuggestions: {
      addSuggestion: vi.fn().mockResolvedValue({ id: "new-id" }),
    },
  },
}));

const addSuggestion = api.conceptMappingSuggestions.addSuggestion as ReturnType<typeof vi.fn>;

// MappingDrawer talks to the terminology search widget over a window CustomEvent (it lives
// in a separate module-federated remote); capture the props it dispatches so we can drive
// onConceptIdSelect the same way that widget would.
const captureTerminologyProps = (): Promise<TerminologyProps> =>
  new Promise((resolve) => {
    window.addEventListener(
      "alp-terminology-open",
      (event) => resolve((event as CustomEvent<{ props: TerminologyProps }>).detail.props),
      { once: true }
    );
  });

describe("MappingDrawer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    addSuggestion.mockResolvedValue({ id: "new-id" });
  });

  const state = {
    ...initialState,
    columnMapping: { sourceCode: "code", sourceName: "name", sourceFrequency: "", description: "" },
    selectedData: { sourceRowId: "r1", code: "A1", name: "Aspirin" },
  };

  test("selecting a concept calls addSuggestion with the source row id and concept fields, then notifies the caller", async () => {
    const onSuggestionAdded = vi.fn();
    const propsPromise = captureTerminologyProps();

    renderWithProviders(<MappingDrawer selectedDatasetId="ds-1" dataflowId="df-1" nodeId="node-1" onSuggestionAdded={onSuggestionAdded} />, {
      state,
    });

    const props = await propsPromise;
    props.onConceptIdSelect?.({
      conceptId: 111,
      conceptName: "Aspirin",
      conceptCode: "1191",
      domainId: "Drug",
      vocabularyId: "RxNorm",
    });

    expect(addSuggestion).toHaveBeenCalledWith("df-1", "node-1", "r1", {
      conceptId: 111,
      conceptName: "Aspirin",
      conceptCode: "1191",
      domainId: "Drug",
      vocabularyId: "RxNorm",
    });
    await waitFor(() => expect(onSuggestionAdded).toHaveBeenCalledTimes(1));
  });

  test("selecting a concept clears the selected data (closes the drawer) synchronously", async () => {
    const propsPromise = captureTerminologyProps();
    const { dispatch } = renderWithProviders(<MappingDrawer selectedDatasetId="ds-1" dataflowId="df-1" nodeId="node-1" />, {
      state,
    });

    const props = await propsPromise;
    props.onConceptIdSelect?.({
      conceptId: 111,
      conceptName: "Aspirin",
      conceptCode: "1191",
      domainId: "Drug",
      vocabularyId: "RxNorm",
    });

    expect(dispatch).toHaveBeenCalledWith({ type: "CLEAR_SELECTED_DATA" });
  });
});
