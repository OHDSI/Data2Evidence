import { describe, expect, test, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../test/render";
import { Step3ConceptMapping } from "./Step3ConceptMapping";

vi.mock("../axios/api", () => ({
  api: { terminology: { getStandardConcepts: vi.fn().mockResolvedValue([]), getAllFilterOptions: vi.fn() } },
}));

describe("Step3ConceptMapping", () => {
  test("renders the mapping table toolbar", () => {
    renderWithProviders(<Step3ConceptMapping selectedDatasetId="ds-1" />);
    expect(screen.getByText(/Populate concepts/i)).toBeInTheDocument();
  });
});
