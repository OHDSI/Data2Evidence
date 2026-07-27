import { describe, expect, test, vi } from "vitest";
import { screen } from "@testing-library/react";
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
});
