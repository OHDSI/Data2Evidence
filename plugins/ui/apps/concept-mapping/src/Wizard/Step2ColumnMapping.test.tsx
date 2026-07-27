import { describe, expect, test } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../test/render";
import { initialState } from "../Context/ConceptMappingContext";
import { Step2ColumnMapping } from "./Step2ColumnMapping";

const state = {
  ...initialState,
  wizard: { ...initialState.wizard, sourceData: { type: "csv" as const, columns: ["code", "name", "freq"] } },
};

describe("Step2ColumnMapping", () => {
  test("renders a mapping control for each target label", () => {
    renderWithProviders(<Step2ColumnMapping />, { state });
    expect(screen.getByText(/Source code column/i)).toBeInTheDocument();
    expect(screen.getByText(/Source name column/i)).toBeInTheDocument();
    expect(screen.getByText(/Source frequency column/i)).toBeInTheDocument();
  });

  test("renders without crashing when no source columns", () => {
    renderWithProviders(<Step2ColumnMapping />, { state: initialState });
    expect(screen.getByText(/Column mapping/i)).toBeInTheDocument();
  });
});
