import { describe, expect, test, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "../test/render";

// `Checkbox` wraps the `d4l-checkbox` Stencil custom element (scoped, not shadow-DOM).
// It only hydrates real light-DOM content (input + visible label) once the host shell
// registers the element via `registerWebComponents` (see apps/portal/src/index.tsx) -
// something this app's unit tests never bootstrap. Without that, jsdom renders it as an
// inert, childless custom element, so its `label` text is unqueryable. Mirroring the
// existing convention in this monorepo (see apps/portal UserOverview.test.tsx and
// apps/concept-sets TerminologyList.test.tsx), stub it with a plain, real DOM control.
vi.mock("@portal/components", () => ({
  Checkbox: (props: any) => (
    <label>
      <input type="checkbox" checked={props.checked} onChange={props.onChange} />
      {props.label}
    </label>
  ),
}));

import { Step1Source } from "./Step1Source";
import { ConceptMappingContext, ConceptMappingDispatchContext, initialState } from "../Context/ConceptMappingContext";
import { ACTION_TYPES } from "../Context/reducers";

const datasets = [{ id: "ds-1", studyDetail: { name: "Demo" }, databaseCode: "db", schemaName: "s" } as any];

describe("Step1Source", () => {
  test("default state shows both source options", () => {
    renderWithProviders(<Step1Source datasets={datasets} onResetDownstream={vi.fn()} />);
    expect(screen.getByText(/Upload a CSV file/i)).toBeInTheDocument();
    expect(screen.getByText(/Connect a Database Query/i)).toBeInTheDocument();
  });

  test("connected node shows name/type/description card and the CSV-removal hint", () => {
    const sourceNode = { name: "My Py2Table", type: "py2table_node", description: "produces rows", map: { a: [] } };
    renderWithProviders(
      <Step1Source datasets={datasets} onResetDownstream={vi.fn()} sourceNode={sourceNode} />
    );
    expect(screen.getByText("My Py2Table")).toBeInTheDocument();
    expect(screen.getByText(/produces rows/i)).toBeInTheDocument();
    expect(screen.getByText(/remove this connection/i)).toBeInTheDocument();
  });

  test("connected node with no extractable columns shows manual column entry", () => {
    const sourceNode = { name: "SQL", type: "sql_node", description: "" }; // no result → null columns
    renderWithProviders(
      <Step1Source datasets={datasets} onResetDownstream={vi.fn()} sourceNode={sourceNode} />
    );
    expect(screen.getByText(/Enter source columns/i)).toBeInTheDocument();
  });

  test("shows the load-recommendation checkbox", () => {
    renderWithProviders(<Step1Source datasets={datasets} onResetDownstream={vi.fn()} />);
    expect(screen.getByText(/Load concept recommendation by default/i)).toBeInTheDocument();
  });

  test("reopening with an unchanged connected node does not reset downstream or re-dispatch source data", () => {
    const sourceNode = { name: "My Py2Table", type: "py2table_node", description: "produces rows", map: { a: [] } };
    // Pre-seeded exactly as this node's derived SourceData would already look - simulating
    // a drawer reopen for a node connected (and mapped) in a prior session.
    const state = {
      ...initialState,
      wizard: {
        ...initialState.wizard,
        sourceData: {
          type: "node" as const,
          columns: ["a"],
          nodeMeta: { name: "My Py2Table", type: "py2table_node", description: "produces rows" },
        },
      },
    };
    const onResetDownstream = vi.fn();
    const { dispatch } = renderWithProviders(
      <Step1Source datasets={datasets} onResetDownstream={onResetDownstream} sourceNode={sourceNode} />,
      { state }
    );

    expect(onResetDownstream).not.toHaveBeenCalled();
    expect(dispatch.mock.calls.some((call: any[]) => call[0]?.type === ACTION_TYPES.SET_SOURCE_DATA)).toBe(false);
  });

  test("connecting a genuinely different node resets downstream and dispatches new source data", () => {
    const sourceNode = { name: "New Node", type: "py2table_node", description: "new", map: { x: [] } };
    // Pre-seeded with a different node's SourceData, so this connection is a real change.
    const state = {
      ...initialState,
      wizard: {
        ...initialState.wizard,
        sourceData: {
          type: "node" as const,
          columns: ["old"],
          nodeMeta: { name: "Old Node", type: "py2table_node", description: "old" },
        },
      },
    };
    const onResetDownstream = vi.fn();
    const { dispatch } = renderWithProviders(
      <Step1Source datasets={datasets} onResetDownstream={onResetDownstream} sourceNode={sourceNode} />,
      { state }
    );

    expect(onResetDownstream).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({
      type: ACTION_TYPES.SET_SOURCE_DATA,
      payload: {
        type: "node",
        columns: ["x"],
        nodeMeta: { name: "New Node", type: "py2table_node", description: "new" },
      },
    });
  });

  test("swapping to a different no-columns node does not reuse the previous node's manually-typed columns", () => {
    const nodeA = { name: "SQL A", type: "sql_node", description: "" };
    const nodeB = { name: "SQL B", type: "sql_node", description: "" };
    const onResetDownstream = vi.fn();
    const { dispatch, rerender } = renderWithProviders(
      <Step1Source datasets={datasets} onResetDownstream={onResetDownstream} sourceNode={nodeA} />
    );

    // Type manual columns for node A.
    fireEvent.change(screen.getByLabelText(/Enter source columns/i), { target: { value: "col1,col2" } });

    // Swap to a different node while the component stays mounted (same Provider tree, so
    // refs/local state persist across this update - unlike the unmount+remount case covered
    // by the "reopening" test above). `renderWithProviders` doesn't itself expose a
    // props-only rerender, so the same Provider wrapping is reconstructed here directly.
    rerender(
      <ConceptMappingContext.Provider value={initialState}>
        <ConceptMappingDispatchContext.Provider value={dispatch}>
          <Step1Source datasets={datasets} onResetDownstream={onResetDownstream} sourceNode={nodeB} />
        </ConceptMappingDispatchContext.Provider>
      </ConceptMappingContext.Provider>
    );

    // The manual-columns input itself must reset to empty for the new node...
    expect(screen.getByLabelText(/Enter source columns/i)).toHaveValue("");

    // ...and the dispatch for node B must not carry node A's typed columns.
    const lastSourceDataCall = dispatch.mock.calls
      .filter((call: any[]) => call[0]?.type === ACTION_TYPES.SET_SOURCE_DATA)
      .pop();
    expect(lastSourceDataCall?.[0]?.payload).toEqual({
      type: "node",
      columns: [],
      nodeMeta: { name: "SQL B", type: "sql_node", description: "" },
    });
  });
});
