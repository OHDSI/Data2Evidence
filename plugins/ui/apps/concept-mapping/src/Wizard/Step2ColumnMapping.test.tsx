import { describe, expect, test, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "../test/render";
import { initialState } from "../Context/ConceptMappingContext";
import { Step2ColumnMapping } from "./Step2ColumnMapping";

// `Checkbox` wraps the `d4l-checkbox` Stencil custom element (scoped, not shadow-DOM) - see
// Step1Source.test.tsx for the full rationale. `TablePaginationActions` is a plain
// FC in @portal/components, but the whole module is stubbed here (rather than
// `vi.importActual`-ing the rest) to avoid its unrelated side effects in jsdom.
vi.mock("@portal/components", () => ({
  Checkbox: (props: any) => (
    <label>
      <input type="checkbox" checked={props.checked} onChange={props.onChange} />
      {props.label}
    </label>
  ),
  TablePaginationActions: () => null,
}));

vi.mock("../axios/api", () => ({
  api: {
    terminology: {
      getAllFilterOptions: vi.fn().mockResolvedValue({ filterOptions: { domainId: { Condition: [], Drug: [] } } }),
    },
  },
}));

const state = {
  ...initialState,
  wizard: {
    ...initialState.wizard,
    sourceData: {
      type: "csv" as const,
      columns: ["code", "name", "freq"],
      rows: [{ code: "A1", name: "Aspirin", freq: "10" }],
    },
  },
};

describe("Step2ColumnMapping", () => {
  test("renders the '3. Column mapping' panel title and the four select labels", () => {
    renderWithProviders(<Step2ColumnMapping />, { state });
    expect(screen.getByText("3. Column mapping")).toBeInTheDocument();
    expect(screen.getByText(/Source code column/i)).toBeInTheDocument();
    expect(screen.getByText(/Source name column/i)).toBeInTheDocument();
    expect(screen.getByText(/Source frequency column/i)).toBeInTheDocument();
    expect(screen.getByText(/Additional info column/i)).toBeInTheDocument();
  });

  test("renders the source-data preview table (headers + rows) when rows are present", () => {
    renderWithProviders(<Step2ColumnMapping />, { state });
    // Column headers
    expect(screen.getByText("code")).toBeInTheDocument();
    expect(screen.getByText("name")).toBeInTheDocument();
    expect(screen.getByText("freq")).toBeInTheDocument();
    // Row data
    expect(screen.getByText("A1")).toBeInTheDocument();
    expect(screen.getByText("Aspirin")).toBeInTheDocument();
  });

  test("renders without crashing when there is no source data (empty preview, no rows/columns)", () => {
    renderWithProviders(<Step2ColumnMapping />, { state: initialState });
    expect(screen.getByText("3. Column mapping")).toBeInTheDocument();
  });

  test("the 'Show source domain column selection' checkbox reveals the domain select", async () => {
    renderWithProviders(<Step2ColumnMapping selectedDatasetId="ds-1" />, { state });
    // Exact text, not a substring match: the checkbox's own label ("Show source domain
    // column selection") also contains the phrase "source domain column".
    expect(screen.queryByText("Source domain column")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox"));

    expect(await screen.findByText("Source domain column")).toBeInTheDocument();
  });
});
