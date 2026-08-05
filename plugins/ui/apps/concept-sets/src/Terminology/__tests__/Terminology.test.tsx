import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

// --- Mocks ---
// These mirror the mocking approach used by TerminologyList.test.tsx: hooks,
// axios/api and the scss import are stubbed so the component tree can render
// in isolation. TerminologyList itself is mocked to a minimal stand-in that
// exposes just the "pick a concept" seam (onSelectConceptId) — the radio
// rendering behavior for CONCEPT_MAPPING is already covered by
// TerminologyList's own test file.

vi.mock("../../hooks", () => ({
  usePortal: () => ({
    userName: "user-1",
    userId: "user-1",
    datasetId: "dataset-1",
    getToken: async () => undefined,
    features: [],
    featuresLoading: false,
  }),
  useTranslation: () => ({
    getText: (key: string) => key,
    changeLocale: vi.fn(),
    locale: "default",
  }),
}));

vi.mock("../../axios/api", () => ({
  api: {
    d2eWebapi: {
      checkIfConceptSetExists: vi.fn(),
      createConceptSet: vi.fn(),
      updateConceptSetItems: vi.fn(),
      updateConceptSet: vi.fn(),
      getConceptSet: vi.fn(),
      getConceptSetExpression: vi.fn(),
    },
  },
}));

vi.mock("../utils/d2eWebapiMappers", () => ({
  mapd2eWebapiConcept: vi.fn(),
  mapd2eWebapiConceptSet: vi.fn(),
}));

vi.mock("../Terminology.scss", () => ({}));

vi.mock("@portal/components", () => ({
  Button: ({ text, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {text}
    </button>
  ),
  Chip: ({ label }: any) => <span data-testid="chip">{label}</span>,
}));

const FAKE_CONCEPT = { conceptId: 42, conceptName: "Fake Concept" };

vi.mock("../components/TerminologyList/TerminologyList", () => ({
  default: ({ onSelectConceptId }: any) => (
    <button
      data-testid="select-concept-btn"
      onClick={() => onSelectConceptId(FAKE_CONCEPT)}
    >
      select concept
    </button>
  ),
}));

vi.mock("../components/TerminologyDetail/TerminologyDetail", () => ({
  default: () => null,
}));

// --- Test imports (after mocks) ---

import Terminology from "../Terminology";

describe("Terminology - CONCEPT_MAPPING Suggest flow", () => {
  it("shows the 'Suggest a concepts' header and a disabled Suggest button before any pick", () => {
    render(
      <Terminology
        mode="CONCEPT_MAPPING"
        open
        onClose={vi.fn()}
        onConceptIdSelect={vi.fn()}
        userId="user-1"
        selectedDatasetId="dataset-1"
        isAtlas={false}
      />,
    );

    expect(screen.getByText("TERMINOLOGY__SUGGEST_CONCEPTS")).toBeTruthy();
    const suggestButton = screen
      .getByText("TERMINOLOGY__SUGGEST")
      .closest("button") as HTMLButtonElement;
    expect(suggestButton.disabled).toBe(true);
  });

  it("does not fire onConceptIdSelect on pick — only records the pending selection", () => {
    const onConceptIdSelect = vi.fn();

    render(
      <Terminology
        mode="CONCEPT_MAPPING"
        open
        onClose={vi.fn()}
        onConceptIdSelect={onConceptIdSelect}
        userId="user-1"
        selectedDatasetId="dataset-1"
        isAtlas={false}
      />,
    );

    fireEvent.click(screen.getByTestId("select-concept-btn"));

    expect(onConceptIdSelect).not.toHaveBeenCalled();
    const suggestButton = screen
      .getByText("TERMINOLOGY__SUGGEST")
      .closest("button") as HTMLButtonElement;
    expect(suggestButton.disabled).toBe(false);
  });

  it("clicking Suggest after a pick fires onConceptIdSelect with the selected concept", () => {
    const onConceptIdSelect = vi.fn();

    render(
      <Terminology
        mode="CONCEPT_MAPPING"
        open
        onClose={vi.fn()}
        onConceptIdSelect={onConceptIdSelect}
        userId="user-1"
        selectedDatasetId="dataset-1"
        isAtlas={false}
      />,
    );

    fireEvent.click(screen.getByTestId("select-concept-btn"));
    const suggestButton = screen
      .getByText("TERMINOLOGY__SUGGEST")
      .closest("button") as HTMLButtonElement;
    fireEvent.click(suggestButton);

    expect(onConceptIdSelect).toHaveBeenCalledWith(
      expect.objectContaining({ conceptId: 42 }),
    );
  });

  it("renders the source-info line and status chip when sourceRow is provided", () => {
    render(
      <Terminology
        mode="CONCEPT_MAPPING"
        open
        onClose={vi.fn()}
        onConceptIdSelect={vi.fn()}
        userId="user-1"
        selectedDatasetId="dataset-1"
        isAtlas={false}
        sourceRow={{
          code: "C1",
          name: "N1",
          frequency: "5",
          description: "D1",
          status: "Pending",
        }}
      />,
    );

    expect(screen.getByText(/C1/)).toBeTruthy();
    expect(screen.getByText(/N1/)).toBeTruthy();
    expect(screen.getByTestId("chip").textContent).toBe("Pending");
  });
});
