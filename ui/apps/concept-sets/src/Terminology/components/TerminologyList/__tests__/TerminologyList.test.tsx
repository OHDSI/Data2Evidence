import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act, waitFor } from "@testing-library/react";
import React from "react";
import type {
  FilterOptions,
  FhirValueSetExpansionContainsWithExt,
} from "../../../utils/types";

// --- Hoisted mocks (available inside vi.mock factories) ---

const {
  mockSetFeedback,
  mockGetText,
  mockGetTerminologies,
  mockGetConceptsCount,
  mockGetFilterOptions,
  mockGetConceptRecordCounts,
  mockGetRecommendedConcepts,
} = vi.hoisted(() => ({
  mockSetFeedback: vi.fn(),
  mockGetText: vi.fn((key: string) => key),
  mockGetTerminologies: vi.fn(),
  mockGetConceptsCount: vi.fn(),
  mockGetFilterOptions: vi.fn(),
  mockGetConceptRecordCounts: vi.fn(),
  mockGetRecommendedConcepts: vi.fn(),
}));

vi.mock("../../../../hooks", () => ({
  useFeedback: () => ({
    setFeedback: mockSetFeedback,
    clearFeedback: vi.fn(),
    getFeedback: vi.fn(),
    setGenericErrorFeedback: vi.fn(),
  }),
  useTranslation: () => ({
    getText: mockGetText,
    changeLocale: vi.fn(),
    locale: "default",
  }),
}));

vi.mock("../../../../utils/PortalUtils", () => ({
  getPortalAPI: () => null,
}));

vi.mock("../../../../components/SearchBar/SearchBar", () => ({
  default: ({ keyword, onEnter }: any) => (
    <input
      data-testid="search-bar"
      defaultValue={keyword}
      onChange={(e) => onEnter(e.target.value)}
    />
  ),
}));

vi.mock("../../../../components/icons/AddIcon", () => ({
  default: () => <span data-testid="add-icon">+</span>,
}));

vi.mock("../../../../components/icons/RemoveIcon", () => ({
  default: () => <span data-testid="remove-icon">-</span>,
}));

vi.mock("@portal/components", () => ({
  TablePaginationActions: () => null,
}));

vi.mock("../TerminologyList.scss", () => ({}));

vi.mock("../../../../axios/terminology", () => ({
  Terminology: class {
    getFilterOptions = mockGetFilterOptions;
    getRecommendedConcepts = mockGetRecommendedConcepts;
  },
}));

vi.mock("../../../../axios/api", () => ({
  api: {
    terminology: {
      getConceptsCount: mockGetConceptsCount,
    },
    d2eWebapi: {
      getTerminologies: mockGetTerminologies,
      getConceptRecordCounts: mockGetConceptRecordCounts,
    },
    publicWebapiProxyAPI: {},
  },
}));

// --- Test imports (after mocks) ---

import TerminologyList from "../TerminologyList";

// --- Helpers ---

const sampleFilterOptions: FilterOptions = {
  conceptClassId: { "Clinical Finding": 100, Procedure: 50 },
  domainId: { Condition: 200, Drug: 150, Observation: 80 },
  standardConcept: { S: 300, "": 100 },
  vocabularyId: { SNOMED: 250, RxNorm: 100 },
  concept: { Standard: 300, "Non-standard": 100 },
  validity: { Valid: 350, Invalid: 50 },
};

const sampleConcepts = [
  {
    CONCEPT_ID: 1,
    CONCEPT_NAME: "Test Concept",
    DOMAIN_ID: "Condition",
    VOCABULARY_ID: "SNOMED",
    CONCEPT_CLASS_ID: "Clinical Finding",
    STANDARD_CONCEPT: "S",
    STANDARD_CONCEPT_CAPTION: "Standard",
    CONCEPT_CODE: "123",
    INVALID_REASON: null,
    INVALID_REASON_CAPTION: "Valid",
    VALID_START_DATE: "2020-01-01",
    VALID_END_DATE: "2099-12-31",
  },
];

const sampleMappedConcept: FhirValueSetExpansionContainsWithExt = {
  conceptId: 1,
  display: "Test Concept",
  conceptName: "Test Concept",
  domainId: "Condition",
  system: "SNOMED",
  vocabularyId: "SNOMED",
  conceptClassId: "Clinical Finding",
  standardConcept: "S",
  concept: "Standard",
  code: "123",
  conceptCode: "123",
  validStartDate: "1/1/2020",
  validEndDate: "12/31/2099",
  validity: "Valid",
};

function setupDefaultMocks() {
  mockGetTerminologies.mockResolvedValue(sampleConcepts);
  mockGetConceptsCount.mockResolvedValue(1);
  mockGetConceptRecordCounts.mockResolvedValue([{ "1": [10, 20, 5, 8] }]);
  mockGetFilterOptions.mockResolvedValue(sampleFilterOptions);
  mockGetRecommendedConcepts.mockResolvedValue([]);
}

/** Wait for all pending promises and effects to settle */
async function flushEffects(ms = 200) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
}

/** Extract filter args from a mock call by index */
function getDomainIdFilter(call: any[]): string[] {
  return call[5];
}
function getVocabularyIdFilter(call: any[]): string[] {
  return call[6];
}
function getStandardConceptFilter(call: any[]): string[] {
  return call[7];
}
function getSearchText(call: any[]): string {
  return call[3];
}

// --- Prop presets for different real-world use cases ---

const baseProps = {
  userId: "user-1",
  onConceptClick: vi.fn(),
  selectedConceptId: null,
  initialInput: "",
  selectedConcepts: [] as FhirValueSetExpansionContainsWithExt[],
  tab: "SEARCH" as const,
  showAddIcon: false,
  conceptsResult: null,
  setConceptsResult: vi.fn(),
  datasetId: "dataset-1",
  isDrawer: false,
  isAtlas: false,
};

/** Concepts page — no filters, no drawer, not Atlas */
const conceptsPageProps = {
  ...baseProps,
  mode: "CONCEPT_SEARCH" as const,
  showAddIcon: true,
};

/** PA-Atlas CONCEPT_MULTI_SELECT — isAtlas, drawer, domain filter */
const paAtlasMultiSelectProps = {
  ...baseProps,
  isAtlas: true,
  isDrawer: true,
  mode: "CONCEPT_MULTI_SELECT" as const,
  showAddIcon: true,
  defaultFilters: [{ id: "domainId", value: ["Condition"] }],
};

/** PA-Atlas CONCEPT_SET — isAtlas, drawer, domain filter */
const paAtlasConceptSetProps = {
  ...baseProps,
  isAtlas: true,
  isDrawer: true,
  mode: "CONCEPT_SET" as const,
  showAddIcon: true,
  defaultFilters: [{ id: "domainId", value: ["Condition"] }],
};

/** Concept Mapping — drawer, domain + standard concept filters, initialInput */
const conceptMappingProps = {
  ...baseProps,
  isDrawer: true,
  mode: "CONCEPT_MAPPING" as const,
  showAddIcon: true,
  defaultFilters: [
    { id: "concept", value: ["Standard"] },
    { id: "domainId", value: ["Condition"] },
  ],
  initialInput: "diabetes",
};

// --- Tests ---

describe("TerminologyList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  // ==========================================
  // Use case: Concepts page (no defaultFilters)
  // ==========================================
  describe("Concepts page (CONCEPT_SEARCH, no defaultFilters)", () => {
    it("renders without crashing", async () => {
      await act(async () => {
        render(<TerminologyList {...conceptsPageProps} />);
      });
    });

    it("fetches data on mount with empty filters", async () => {
      await act(async () => {
        render(<TerminologyList {...conceptsPageProps} />);
      });

      await waitFor(() => {
        expect(mockGetTerminologies).toHaveBeenCalled();
      });

      // All calls should have empty filters
      for (const call of mockGetTerminologies.mock.calls) {
        expect(getDomainIdFilter(call)).toEqual([]);
        expect(getVocabularyIdFilter(call)).toEqual([]);
        expect(getStandardConceptFilter(call)).toEqual([]);
      }
    });

    it("fetches concept record counts (non-Atlas)", async () => {
      await act(async () => {
        render(<TerminologyList {...conceptsPageProps} />);
      });

      await waitFor(() => {
        expect(mockGetConceptRecordCounts).toHaveBeenCalled();
      });
    });

    it("does not fetch data when userId is missing", async () => {
      await act(async () => {
        render(
          <TerminologyList {...conceptsPageProps} userId={undefined} />,
        );
      });

      await flushEffects();
      expect(mockGetTerminologies).not.toHaveBeenCalled();
    });

    it("does not fetch data when datasetId is missing", async () => {
      await act(async () => {
        render(
          <TerminologyList {...conceptsPageProps} datasetId={undefined} />,
        );
      });

      await flushEffects();
      expect(mockGetTerminologies).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // Use case: PA-Atlas with isAtlas=true, no defaultFilters
  // ==========================================
  describe("PA-Atlas CONCEPT_SEARCH (isAtlas=true, no defaultFilters)", () => {
    const paAtlasSearchProps = {
      ...baseProps,
      isAtlas: true,
      isDrawer: false,
      mode: "CONCEPT_SEARCH" as const,
      showAddIcon: true,
    };

    it("fetches data with empty filters", async () => {
      await act(async () => {
        render(<TerminologyList {...paAtlasSearchProps} />);
      });

      await waitFor(() => {
        expect(mockGetTerminologies).toHaveBeenCalled();
      });

      for (const call of mockGetTerminologies.mock.calls) {
        expect(getDomainIdFilter(call)).toEqual([]);
      }
    });

    it("does NOT fetch concept record counts (Atlas skips this)", async () => {
      await act(async () => {
        render(<TerminologyList {...paAtlasSearchProps} />);
      });

      await flushEffects(500);
      expect(mockGetConceptRecordCounts).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // Use case: PA-Atlas CONCEPT_MULTI_SELECT with defaultFilters
  // (QueryFilterModern.vue dispatches with domainId filter)
  // ==========================================
  describe("PA-Atlas CONCEPT_MULTI_SELECT (isAtlas=true, defaultFilters)", () => {
    it("makes an initial fetch WITHOUT filters (the bug)", async () => {
      await act(async () => {
        render(<TerminologyList {...paAtlasMultiSelectProps} />);
      });

      await waitFor(() => {
        expect(mockGetTerminologies).toHaveBeenCalled();
      });

      const firstCall = mockGetTerminologies.mock.calls[0];
      expect(getDomainIdFilter(firstCall)).toEqual([]);
    });

    it("eventually applies validated defaultFilters after filterOptions load", async () => {
      await act(async () => {
        render(<TerminologyList {...paAtlasMultiSelectProps} />);
      });

      await flushEffects(500);

      const callsWithFilter = mockGetTerminologies.mock.calls.filter(
        (call) => getDomainIdFilter(call).length > 0,
      );
      expect(callsWithFilter.length).toBeGreaterThanOrEqual(1);
      expect(getDomainIdFilter(callsWithFilter[0])).toEqual(["Condition"]);
    });

    it("does NOT fetch concept record counts (Atlas mode)", async () => {
      await act(async () => {
        render(<TerminologyList {...paAtlasMultiSelectProps} />);
      });

      await flushEffects(500);
      expect(mockGetConceptRecordCounts).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // Use case: PA-Atlas CONCEPT_SET with defaultFilters
  // (app-tag-input.vue dispatches with domainId filter)
  // ==========================================
  describe("PA-Atlas CONCEPT_SET (isAtlas=true, defaultFilters)", () => {
    it("makes an initial fetch WITHOUT filters (the bug)", async () => {
      await act(async () => {
        render(<TerminologyList {...paAtlasConceptSetProps} />);
      });

      await waitFor(() => {
        expect(mockGetTerminologies).toHaveBeenCalled();
      });

      const firstCall = mockGetTerminologies.mock.calls[0];
      expect(getDomainIdFilter(firstCall)).toEqual([]);
    });

    it("eventually applies defaultFilters after filterOptions load", async () => {
      await act(async () => {
        render(<TerminologyList {...paAtlasConceptSetProps} />);
      });

      await flushEffects(500);

      const callsWithFilter = mockGetTerminologies.mock.calls.filter(
        (call) => getDomainIdFilter(call).length > 0,
      );
      expect(callsWithFilter.length).toBeGreaterThanOrEqual(1);
      expect(getDomainIdFilter(callsWithFilter[0])).toEqual(["Condition"]);
    });
  });

  // ==========================================
  // Use case: Concept Mapping drawer
  // (MappingDrawer.tsx dispatches with domain + standard concept filters + initialInput)
  // ==========================================
  describe("Concept Mapping (CONCEPT_MAPPING, defaultFilters + initialInput)", () => {
    it("uses initialInput as search text in the fetch", async () => {
      await act(async () => {
        render(<TerminologyList {...conceptMappingProps} />);
      });

      await waitFor(() => {
        expect(mockGetTerminologies).toHaveBeenCalled();
      });

      const firstCall = mockGetTerminologies.mock.calls[0];
      expect(getSearchText(firstCall)).toBe("diabetes");
    });

    it("applies both domain and concept standard filters after validation", async () => {
      await act(async () => {
        render(<TerminologyList {...conceptMappingProps} />);
      });

      await flushEffects(500);

      // Find calls with domain filter applied
      const callsWithFilter = mockGetTerminologies.mock.calls.filter(
        (call) => getDomainIdFilter(call).length > 0,
      );
      expect(callsWithFilter.length).toBeGreaterThanOrEqual(1);

      const filteredCall = callsWithFilter[callsWithFilter.length - 1];
      expect(getDomainIdFilter(filteredCall)).toEqual(["Condition"]);
      // "concept" filter maps to standardConceptFilters via: concept === "Standard" ? "S" : "Non-standard"
      expect(getStandardConceptFilter(filteredCall)).toEqual(["S"]);
    });

    it("fetches concept record counts (non-Atlas mode)", async () => {
      await act(async () => {
        render(<TerminologyList {...conceptMappingProps} />);
      });

      await waitFor(() => {
        expect(mockGetConceptRecordCounts).toHaveBeenCalled();
      });
    });
  });

  // ==========================================
  // defaultFilters validation logic
  // ==========================================
  describe("defaultFilters validation", () => {
    it("validates values case-insensitively against filterOptions", async () => {
      const defaultFilters = [{ id: "domainId", value: ["condition"] }];

      await act(async () => {
        render(
          <TerminologyList {...baseProps} defaultFilters={defaultFilters} />,
        );
      });

      await flushEffects(500);

      const callsWithFilter = mockGetTerminologies.mock.calls.filter(
        (call) => getDomainIdFilter(call).length > 0,
      );
      expect(callsWithFilter.length).toBeGreaterThanOrEqual(1);
      expect(getDomainIdFilter(callsWithFilter[0])).toEqual(["Condition"]);
    });

    it("filters out values that don't exist in filterOptions", async () => {
      const defaultFilters = [
        { id: "domainId", value: ["NonExistentDomain"] },
      ];

      await act(async () => {
        render(
          <TerminologyList {...baseProps} defaultFilters={defaultFilters} />,
        );
      });

      await flushEffects(500);

      for (const call of mockGetTerminologies.mock.calls) {
        expect(getDomainIdFilter(call)).toEqual([]);
      }
    });

    it("keeps valid values and drops invalid ones from the same filter", async () => {
      const defaultFilters = [
        { id: "domainId", value: ["Condition", "FakeDomain"] },
      ];

      await act(async () => {
        render(
          <TerminologyList {...baseProps} defaultFilters={defaultFilters} />,
        );
      });

      await flushEffects(500);

      const callsWithFilter = mockGetTerminologies.mock.calls.filter(
        (call) => getDomainIdFilter(call).length > 0,
      );
      expect(callsWithFilter.length).toBeGreaterThanOrEqual(1);
      // Only "Condition" kept, "FakeDomain" dropped
      expect(getDomainIdFilter(callsWithFilter[0])).toEqual(["Condition"]);
    });

    it("the first fetch is wasted — unfiltered data gets replaced", async () => {
      const setConceptsResult = vi.fn();
      const defaultFilters = [{ id: "domainId", value: ["Condition"] }];

      await act(async () => {
        render(
          <TerminologyList
            {...baseProps}
            defaultFilters={defaultFilters}
            setConceptsResult={setConceptsResult}
          />,
        );
      });

      await flushEffects(500);

      // setConceptsResult called multiple times proves data is fetched more than once
      expect(setConceptsResult.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ==========================================
  // Tab behavior
  // ==========================================
  describe("tab behavior", () => {
    it("does not fetch data for SELECTED tab", async () => {
      await act(async () => {
        render(<TerminologyList {...baseProps} tab="SELECTED" />);
      });

      await flushEffects();
      expect(mockGetTerminologies).not.toHaveBeenCalled();
    });

    it("fetches recommended concepts for RELATED tab", async () => {
      const selectedConcepts = [sampleMappedConcept];

      await act(async () => {
        render(
          <TerminologyList
            {...baseProps}
            tab="RELATED"
            selectedConcepts={selectedConcepts}
          />,
        );
      });

      await waitFor(() => {
        expect(mockGetRecommendedConcepts).toHaveBeenCalled();
      });

      expect(mockGetRecommendedConcepts).toHaveBeenCalledWith(
        [1], // conceptIds from selectedConcepts
        "dataset-1",
        expect.any(AbortSignal),
      );
      // RELATED tab should NOT call getTerminologies
      expect(mockGetTerminologies).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // Common behavior
  // ==========================================
  describe("common behavior", () => {
    it("fetches filter options on data load", async () => {
      await act(async () => {
        render(<TerminologyList {...baseProps} />);
      });

      await waitFor(() => {
        expect(mockGetFilterOptions).toHaveBeenCalled();
      });
    });

    it("passes an AbortSignal to the API call", async () => {
      await act(async () => {
        render(<TerminologyList {...baseProps} />);
      });

      await waitFor(() => {
        expect(mockGetTerminologies).toHaveBeenCalled();
      });

      const firstSignal = mockGetTerminologies.mock.calls[0][9];
      expect(firstSignal).toBeInstanceOf(AbortSignal);
    });

    it("calls setConceptsResult with fetched data", async () => {
      const setConceptsResult = vi.fn();

      await act(async () => {
        render(
          <TerminologyList
            {...baseProps}
            setConceptsResult={setConceptsResult}
          />,
        );
      });

      await waitFor(() => {
        expect(setConceptsResult).toHaveBeenCalled();
      });

      const result = setConceptsResult.mock.calls[0][0];
      expect(result).toHaveProperty("count");
      expect(result).toHaveProperty("data");
      expect(result.data).toHaveLength(1);
    });
  });

  // ==========================================
  // Error handling
  // ==========================================
  describe("error handling", () => {
    it("calls setFeedback with error when fetch fails", async () => {
      mockGetTerminologies.mockRejectedValue(new Error("Network error"));

      await act(async () => {
        render(<TerminologyList {...baseProps} />);
      });

      await waitFor(() => {
        expect(mockSetFeedback).toHaveBeenCalledWith(
          expect.objectContaining({ type: "error" }),
        );
      });
    });

    it("does not call setFeedback when request is canceled", async () => {
      mockGetTerminologies.mockRejectedValue({ message: "canceled" });

      await act(async () => {
        render(<TerminologyList {...baseProps} />);
      });

      await flushEffects();
      expect(mockSetFeedback).not.toHaveBeenCalled();
    });
  });
});
