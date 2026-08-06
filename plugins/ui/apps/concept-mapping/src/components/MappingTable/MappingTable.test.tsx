import { beforeEach, describe, expect, test, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import { renderWithProviders } from "../../test/render";
import { initialState } from "../../Context/ConceptMappingContext";
import { MappingTable } from "./MappingTable";
import { mappingData } from "../../types";
import { api } from "../../axios/api";
import { NodeSuggestionsRow, SuggestionDto } from "../../axios/concept-mapping-suggestions";

vi.mock("../../axios/api", () => ({
  api: {
    terminology: { getStandardConcepts: vi.fn().mockResolvedValue([]), getAllFilterOptions: vi.fn() },
    conceptMappingSuggestions: {
      getSuggestions: vi.fn().mockResolvedValue([]),
      addSuggestion: vi.fn(),
      approve: vi.fn().mockResolvedValue(undefined),
      unapprove: vi.fn().mockResolvedValue(undefined),
      setRowFlag: vi.fn().mockResolvedValue(undefined),
      clearSuggestions: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

const getSuggestions = api.conceptMappingSuggestions.getSuggestions as ReturnType<typeof vi.fn>;
const addSuggestion = api.conceptMappingSuggestions.addSuggestion as ReturnType<typeof vi.fn>;
const approve = api.conceptMappingSuggestions.approve as ReturnType<typeof vi.fn>;
const unapprove = api.conceptMappingSuggestions.unapprove as ReturnType<typeof vi.fn>;
const setRowFlag = api.conceptMappingSuggestions.setRowFlag as ReturnType<typeof vi.fn>;

const suggestion = (overrides: Partial<SuggestionDto>): SuggestionDto => ({
  id: "s1",
  conceptId: 0,
  conceptName: "",
  conceptCode: "",
  domainId: "",
  vocabularyId: "",
  suggestedBy: "user-1",
  createdAt: "2026-01-01T00:00:00Z",
  isApproved: false,
  ...overrides,
});

const backendRow = (overrides: Partial<NodeSuggestionsRow>): NodeSuggestionsRow => ({
  sourceRowId: "",
  flagged: false,
  suggestions: [],
  ...overrides,
});

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
    getSuggestions.mockResolvedValue([]);
  });

  const rows: mappingData[] = [
    buildRow({ sourceRowId: "r1", code: "A1", name: "Aspirin", conceptId: 0 }),
    buildRow({
      sourceRowId: "r2",
      code: "B2",
      name: "Ibuprofen",
      conceptId: 222,
      conceptName: "Ibuprofen",
      // Recommend/StandardConcepts populates conceptCode and vocabularyId
      // client-side (see MappingTable.tsx's Recommend handler), so a
      // realistic "client-only concept, no backend suggestion yet" row has
      // both set - unlike a plain unchecked row (e.g. r1) that never went
      // through Recommend.
      conceptCode: "5640",
      vocabularyId: "RxNorm",
    }),
    buildRow({ sourceRowId: "r3", code: "C3", name: "Paracetamol", conceptId: 333, conceptName: "Paracetamol" }),
    buildRow({ sourceRowId: "r4", code: "D4", name: "Codeine", conceptId: 0 }),
  ];

  const state = {
    ...initialState,
    columnMapping: { sourceCode: "code", sourceName: "name", sourceFrequency: "", description: "" },
    csvData: { name: "x", columns: ["code", "name"], data: rows },
  };

  // Anchor on the source code cell (unique per row) rather than name/conceptName, which can
  // collide when a row's concept name happens to match another row's source name.
  const rowFor = (code: string) => screen.getByText(code).closest("tr") as HTMLElement;

  test("calls getSuggestions with dataflowId and nodeId on mount", async () => {
    renderWithProviders(<MappingTable selectedDatasetId="ds-1" dataflowId="df-1" nodeId="node-1" />, { state });

    await waitFor(() => expect(getSuggestions).toHaveBeenCalledWith("df-1", "node-1"));
  });

  test("does not call getSuggestions when dataflowId/nodeId are missing", async () => {
    renderWithProviders(<MappingTable selectedDatasetId="ds-1" />, { state });

    await screen.findByText("A1");
    expect(getSuggestions).not.toHaveBeenCalled();
  });

  test("merges suggestions by sourceRowId and renders the derived status chip", async () => {
    getSuggestions.mockResolvedValue([
      backendRow({ sourceRowId: "r2", suggestions: [suggestion({ id: "s1", isApproved: false })] }),
      backendRow({ sourceRowId: "r3", suggestions: [suggestion({ id: "s2", isApproved: true })] }),
    ]);

    renderWithProviders(<MappingTable selectedDatasetId="ds-1" dataflowId="df-1" nodeId="node-1" />, { state });

    // r1 has no matching backend row -> derives unchecked, regardless of any stale local field.
    expect(within(rowFor("A1")).getByText("Unchecked")).toBeInTheDocument();
    // "Suggested (N)" carries the suggestion count.
    await waitFor(() => expect(within(rowFor("B2")).getByText("Suggested (1)")).toBeInTheDocument());
    expect(within(rowFor("C3")).getByText("Approved")).toBeInTheDocument();
  });

  test("Approve is disabled when the row has no concept and no suggestion, enabled when a concept is present", async () => {
    renderWithProviders(<MappingTable selectedDatasetId="ds-1" dataflowId="df-1" nodeId="node-1" />, { state });
    await waitFor(() => expect(getSuggestions).toHaveBeenCalled());

    expect(within(rowFor("A1")).getByRole("button", { name: "Approve" })).toBeDisabled();
    expect(within(rowFor("B2")).getByRole("button", { name: "Approve" })).toBeEnabled();
  });

  test("approved row shows Uncheck instead of Approve", async () => {
    getSuggestions.mockResolvedValue([
      backendRow({ sourceRowId: "r3", suggestions: [suggestion({ id: "s2", isApproved: true })] }),
    ]);

    renderWithProviders(<MappingTable selectedDatasetId="ds-1" dataflowId="df-1" nodeId="node-1" />, { state });

    await waitFor(() => expect(within(rowFor("C3")).getByText("Approved")).toBeInTheDocument());
    expect(within(rowFor("C3")).queryByLabelText("Approve")).not.toBeInTheDocument();
    expect(within(rowFor("C3")).getByLabelText("Uncheck")).toBeInTheDocument();
  });

  test("clicking Approve on a row with an existing suggestion approves it directly and refetches", async () => {
    getSuggestions.mockResolvedValue([
      backendRow({ sourceRowId: "r2", suggestions: [suggestion({ id: "s1", isApproved: false })] }),
    ]);

    renderWithProviders(<MappingTable selectedDatasetId="ds-1" dataflowId="df-1" nodeId="node-1" />, { state });
    await waitFor(() => expect(within(rowFor("B2")).getByText("Suggested (1)")).toBeInTheDocument());

    within(rowFor("B2")).getByRole("button", { name: "Approve" }).click();

    await waitFor(() => expect(approve).toHaveBeenCalledWith("s1"));
    expect(addSuggestion).not.toHaveBeenCalled();
    await waitFor(() => expect(getSuggestions).toHaveBeenCalledTimes(2));
  });

  test("clicking Approve on a client-only concept (no backend suggestion yet) adds then approves, then refetches", async () => {
    addSuggestion.mockResolvedValue(suggestion({ id: "new-id", conceptId: 222, conceptName: "Ibuprofen" }));

    renderWithProviders(<MappingTable selectedDatasetId="ds-1" dataflowId="df-1" nodeId="node-1" />, { state });
    await waitFor(() => expect(getSuggestions).toHaveBeenCalledTimes(1));

    within(rowFor("B2")).getByRole("button", { name: "Approve" }).click();

    await waitFor(() =>
      expect(addSuggestion).toHaveBeenCalledWith("df-1", "node-1", "r2", {
        conceptId: 222,
        conceptName: "Ibuprofen",
        conceptCode: "5640",
        domainId: "",
        vocabularyId: "RxNorm",
      })
    );
    await waitFor(() => expect(approve).toHaveBeenCalledWith("new-id"));
    await waitFor(() => expect(getSuggestions).toHaveBeenCalledTimes(2));
  });

  test("clicking Uncheck calls unapprove with the approved suggestion id, then refetches", async () => {
    getSuggestions.mockResolvedValue([
      backendRow({ sourceRowId: "r3", suggestions: [suggestion({ id: "s2", isApproved: true })] }),
    ]);

    renderWithProviders(<MappingTable selectedDatasetId="ds-1" dataflowId="df-1" nodeId="node-1" />, { state });
    await waitFor(() => expect(within(rowFor("C3")).getByLabelText("Uncheck")).toBeInTheDocument());

    within(rowFor("C3")).getByLabelText("Uncheck").click();

    await waitFor(() => expect(unapprove).toHaveBeenCalledWith("s2"));
    await waitFor(() => expect(getSuggestions).toHaveBeenCalledTimes(2));
  });

  test("clicking Flag calls setRowFlag with the toggled value, then refetches", async () => {
    renderWithProviders(<MappingTable selectedDatasetId="ds-1" dataflowId="df-1" nodeId="node-1" />, { state });
    await waitFor(() => expect(getSuggestions).toHaveBeenCalledTimes(1));

    within(rowFor("A1")).getByLabelText("Flag").click();

    await waitFor(() => expect(setRowFlag).toHaveBeenCalledWith("df-1", "node-1", "r1", true));
    await waitFor(() => expect(getSuggestions).toHaveBeenCalledTimes(2));
  });

  test("clicking Suggest dispatches SET_SELECTED_DATA with the merged row", async () => {
    const { dispatch } = renderWithProviders(
      <MappingTable selectedDatasetId="ds-1" dataflowId="df-1" nodeId="node-1" />,
      { state }
    );
    await waitFor(() => expect(getSuggestions).toHaveBeenCalledTimes(1));

    within(rowFor("A1")).getByLabelText("Suggest").click();

    expect(dispatch).toHaveBeenCalledWith({
      type: "SET_SELECTED_DATA",
      payload: expect.objectContaining({ sourceRowId: "r1", code: "A1", name: "Aspirin" }),
    });
  });

  test("clicking a row does not open the terminology search", async () => {
    const { dispatch } = renderWithProviders(<MappingTable selectedDatasetId="ds-1" />, { state });
    await screen.findByText("A1");

    rowFor("A1").click();

    expect(dispatch).not.toHaveBeenCalled();
  });

  test("renders the dataset reference label with the dataset name", async () => {
    renderWithProviders(<MappingTable selectedDatasetId="ds-1" datasetName="My Dataset" />, { state });

    expect(screen.getByText(/Dataset for concept reference/)).toBeInTheDocument();
    expect(screen.getByText(/My Dataset/)).toBeInTheDocument();
  });

  test("the toolbar no longer has Download CSV or Clear and import another file buttons", async () => {
    renderWithProviders(<MappingTable selectedDatasetId="ds-1" />, { state });

    expect(screen.queryByText("Download CSV")).not.toBeInTheDocument();
    expect(screen.queryByText("Clear and import another file")).not.toBeInTheDocument();
  });

  test("Recommend concept button is disabled when there are no rows without a concept", async () => {
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

  test("shows the suggestion count in the status chip", async () => {
    getSuggestions.mockResolvedValue([
      backendRow({
        sourceRowId: "r2",
        suggestions: [suggestion({ id: "s1" }), suggestion({ id: "s2" }), suggestion({ id: "s3" })],
      }),
    ]);

    renderWithProviders(<MappingTable selectedDatasetId="ds-1" dataflowId="df-1" nodeId="node-1" />, { state });

    await waitFor(() => expect(within(rowFor("B2")).getByText("Suggested (3)")).toBeInTheDocument());
  });

  test("expanding a row reveals each suggestion; approving one calls approve with its id", async () => {
    getSuggestions.mockResolvedValue([
      backendRow({
        sourceRowId: "r2",
        suggestions: [
          suggestion({ id: "s1", conceptId: 111, conceptName: "First concept", isApproved: false }),
          suggestion({ id: "s2", conceptId: 222, conceptName: "Second concept", isApproved: false }),
        ],
      }),
    ]);

    renderWithProviders(<MappingTable selectedDatasetId="ds-1" dataflowId="df-1" nodeId="node-1" />, { state });
    await waitFor(() => expect(within(rowFor("B2")).getByText("Suggested (2)")).toBeInTheDocument());

    within(rowFor("B2")).getByRole("button", { name: "Expand" }).click();

    const firstSub = (await screen.findByText("First concept")).parentElement as HTMLElement;
    expect(screen.getByText("Second concept")).toBeInTheDocument();

    within(firstSub).getByRole("button", { name: "Approve" }).click();

    await waitFor(() => expect(approve).toHaveBeenCalledWith("s1"));
    await waitFor(() => expect(getSuggestions).toHaveBeenCalledTimes(2));
  });

  test("selecting rows shows the bulk toolbar; bulk Flag flags every selected row then refetches", async () => {
    renderWithProviders(<MappingTable selectedDatasetId="ds-1" dataflowId="df-1" nodeId="node-1" />, { state });
    await waitFor(() => expect(getSuggestions).toHaveBeenCalledTimes(1));

    // The first checkbox is MRT's select-all in the header.
    screen.getAllByRole("checkbox")[0].click();

    const toolbar = (await screen.findByText(/selected/)).parentElement as HTMLElement;
    within(toolbar).getByLabelText("Flag").click();

    await waitFor(() => expect(setRowFlag).toHaveBeenCalledWith("df-1", "node-1", "r1", true));
    expect(setRowFlag).toHaveBeenCalledWith("df-1", "node-1", "r2", true);
    await waitFor(() => expect(getSuggestions).toHaveBeenCalledTimes(2));
  });

  test("bulk Approve is disabled when a selected row has more than one suggestion", async () => {
    getSuggestions.mockResolvedValue([
      backendRow({ sourceRowId: "r2", suggestions: [suggestion({ id: "s1" }), suggestion({ id: "s2" })] }),
    ]);

    renderWithProviders(<MappingTable selectedDatasetId="ds-1" dataflowId="df-1" nodeId="node-1" />, { state });
    await waitFor(() => expect(within(rowFor("B2")).getByText("Suggested (2)")).toBeInTheDocument());

    screen.getAllByRole("checkbox")[0].click();

    const toolbar = (await screen.findByText(/selected/)).parentElement as HTMLElement;
    expect(within(toolbar).getByText("Approve").closest("button")).toBeDisabled();
  });
});
