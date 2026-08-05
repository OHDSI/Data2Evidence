import { beforeEach, describe, expect, test, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithProviders } from "../../test/render";
import { initialState } from "../../Context/ConceptMappingContext";
import { MappingTable } from "./MappingTable";
import { ACTION_TYPES } from "../../Context/reducers";
import { mappingData } from "../../types";

vi.mock("../../axios/api", () => ({
  api: { terminology: { getStandardConcepts: vi.fn().mockResolvedValue([]), getAllFilterOptions: vi.fn() } },
}));

const buildRow = (overrides: Partial<mappingData>): mappingData => ({
  status: "unchecked",
  conceptId: 0,
  conceptName: "",
  domainId: "",
  system: "",
  validStartDate: "",
  validEndDate: "",
  validity: null,
  code: "",
  name: "",
  ...overrides,
});

describe("MappingTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const rows: mappingData[] = [
    buildRow({ code: "A1", name: "Aspirin", status: "unchecked", conceptId: 0 }),
    buildRow({ code: "B2", name: "Ibuprofen", status: "suggested", conceptId: 222, conceptName: "Ibuprofen" }),
    buildRow({ code: "C3", name: "Paracetamol", status: "approved", conceptId: 333, conceptName: "Paracetamol" }),
    buildRow({ code: "D4", name: "Codeine", status: "unchecked", conceptId: 0, flagged: true }),
  ];

  const state = {
    ...initialState,
    columnMapping: { sourceCode: "code", sourceName: "name", sourceFrequency: "", description: "" },
    csvData: { name: "x", columns: ["code", "name"], data: rows },
  };

  // Anchor on the source code cell (unique per row) rather than name/conceptName, which can
  // collide when a row's concept name happens to match another row's source name.
  const rowFor = (code: string) => screen.getByText(code).closest("tr") as HTMLElement;

  test("renders a status chip for each status", () => {
    renderWithProviders(<MappingTable selectedDatasetId="ds-1" />, { state });

    expect(within(rowFor("A1")).getByText("Unchecked")).toBeInTheDocument();
    expect(within(rowFor("B2")).getByText("Suggested")).toBeInTheDocument();
    expect(within(rowFor("C3")).getByText("Approved")).toBeInTheDocument();
  });

  test("Approve is disabled when the row has no concept, enabled when it does", () => {
    renderWithProviders(<MappingTable selectedDatasetId="ds-1" />, { state });

    // getByRole("button", …) targets the button specifically — the MUI Tooltip's disabled-
    // span wrapper also carries the "Approve" aria-label, so getByLabelText would be ambiguous.
    expect(within(rowFor("A1")).getByRole("button", { name: "Approve" })).toBeDisabled();
    expect(within(rowFor("B2")).getByRole("button", { name: "Approve" })).toBeEnabled();
  });

  test("approved row shows Uncheck instead of Approve", () => {
    renderWithProviders(<MappingTable selectedDatasetId="ds-1" />, { state });

    expect(within(rowFor("C3")).queryByLabelText("Approve")).not.toBeInTheDocument();
    expect(within(rowFor("C3")).getByLabelText("Uncheck")).toBeInTheDocument();
  });

  test("clicking Flag dispatches TOGGLE_ROW_FLAG with the row reference", () => {
    const { dispatch } = renderWithProviders(<MappingTable selectedDatasetId="ds-1" />, { state });

    within(rowFor("A1")).getByLabelText("Flag").click();

    expect(dispatch).toHaveBeenCalledWith({ type: ACTION_TYPES.TOGGLE_ROW_FLAG, payload: rows[0] });
  });

  test("clicking Suggest dispatches SET_SELECTED_DATA with the row reference", () => {
    const { dispatch } = renderWithProviders(<MappingTable selectedDatasetId="ds-1" />, { state });

    within(rowFor("A1")).getByLabelText("Suggest").click();

    expect(dispatch).toHaveBeenCalledWith({ type: ACTION_TYPES.SET_SELECTED_DATA, payload: rows[0] });
  });

  test("clicking a row does not open the terminology search", () => {
    const { dispatch } = renderWithProviders(<MappingTable selectedDatasetId="ds-1" />, { state });

    rowFor("A1").click();

    expect(dispatch).not.toHaveBeenCalled();
  });

  test("renders the dataset reference label with the dataset name", () => {
    renderWithProviders(<MappingTable selectedDatasetId="ds-1" datasetName="My Dataset" />, { state });

    expect(screen.getByText(/Dataset for concept reference/)).toBeInTheDocument();
    expect(screen.getByText(/My Dataset/)).toBeInTheDocument();
  });

  test("the toolbar no longer has Download CSV or Clear and import another file buttons", () => {
    renderWithProviders(<MappingTable selectedDatasetId="ds-1" />, { state });

    expect(screen.queryByText("Download CSV")).not.toBeInTheDocument();
    expect(screen.queryByText("Clear and import another file")).not.toBeInTheDocument();
  });

  test("Recommend concept button is disabled when there are no rows without a concept", () => {
    const allMapped = {
      ...state,
      csvData: {
        ...state.csvData,
        data: rows.map((r) => ({ ...r, conceptId: r.conceptId || 999 })),
      },
    };
    renderWithProviders(<MappingTable selectedDatasetId="ds-1" />, { state: allMapped });

    expect(screen.getByText("Recommend concept").closest("button")).toBeDisabled();
  });
});
