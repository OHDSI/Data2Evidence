import React from "react";
import { screen, render } from "@testing-library/react";
import "@testing-library/jest-dom";
import TerminologyList from "../TerminologyList";
import { MemoryRouter } from "react-router-dom";

// Mock the contexts
jest.mock("../../../../../../contexts", () => ({
  useTranslation: () => ({
    getText: jest.fn().mockImplementation((key: string) => key),
    i18nKeys: {},
  }),
  useFeedback: () => ({
    setFeedback: jest.fn(),
  }),
}));

// Mock the terminology API
jest.mock("../../../../../../axios/terminology", () => {
  const mockGetTerminologies = jest.fn().mockImplementation(() =>
    Promise.resolve({
      expansion: { total: 0, contains: [] },
    })
  );

  const mockGetFilterOptions = jest.fn().mockImplementation(() =>
    Promise.resolve({
      conceptClassId: { TestClass: 10 },
      domainId: { TestDomain: 15 },
      standardConcept: { Standard: 18 },
      vocabularyId: { TestVocab: 20 },
      concept: { Standard: 18 },
      validity: { Valid: 20 },
    })
  );

  const mockGetRecommendedConcepts = jest.fn().mockImplementation(() => Promise.resolve([]));

  class MockTerminology {
    getTerminologies = mockGetTerminologies;
    getFilterOptions = mockGetFilterOptions;
    getRecommendedConcepts = mockGetRecommendedConcepts;
  }

  return {
    Terminology: MockTerminology,
    terminologyApi: {
      getTerminologies: mockGetTerminologies,
      getFilterOptions: mockGetFilterOptions,
      getRecommendedConcepts: mockGetRecommendedConcepts,
    },
  };
});

// Mock Material React Table to simplify testing
jest.mock("material-react-table", () => ({
  MaterialReactTable: ({ table }: any) => {
    const data = table?.options?.data || [];
    const columns = table?.options?.columns || [];
    return (
      <div data-testid="terminology-table">
        <div>Columns: {columns?.length || 0}</div>
        <div>Rows: {data?.length || 0}</div>
        {data?.map((row: any, index: number) => (
          <div key={index} data-testid={`table-row-${index}`}>
            {row.display || row.conceptId}
          </div>
        ))}
      </div>
    );
  },
  useMaterialReactTable: ({ data, columns }: any) => ({
    options: { data, columns },
    getRowModel: () => ({
      rows:
        data?.map((item: any, index: number) => ({
          id: index,
          original: item,
        })) || [],
    }),
    getState: () => ({
      pagination: { pageIndex: 0, pageSize: 20 },
      columnFilters: [],
      globalFilter: "",
    }),
    setPageIndex: jest.fn(),
    setPageSize: jest.fn(),
    getCanPreviousPage: () => false,
    getCanNextPage: () => false,
    getPageCount: () => 1,
    getPrePaginationRowModel: () => ({
      rows: data || [],
    }),
  }),
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(<MemoryRouter>{component}</MemoryRouter>);
};

describe("TerminologyList Component", () => {
  const defaultProps = {
    userId: "test-user-123",
    onConceptClick: jest.fn(),
    selectedConceptId: null,
    onSelectConceptId: jest.fn(),
    initialInput: "",
    isConceptSet: false,
    selectedConcepts: [],
    tab: "SEARCH" as const,
    toggleDescendantsAndMapped: jest.fn(),
    showAddIcon: true,
    conceptsResult: null,
    setConceptsResult: jest.fn(),
    datasetId: "", // Empty to avoid getAllFilterOptions for basic tests
    isDrawer: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("renders without crashing", () => {
      renderWithRouter(<TerminologyList {...defaultProps} />);
      expect(screen.getByTestId("terminology-table")).toBeInTheDocument();
    });

    it("displays search results when provided", () => {
      const mockResult = {
        data: [
          {
            conceptId: 1,
            display: "Test Concept 1",
            domainId: "TestDomain",
            system: "TestSystem",
            conceptClassId: "TestClass",
            standardConcept: "S",
            concept: "Standard",
            code: "TEST001",
            validStartDate: "2020-01-01",
            validEndDate: "2099-12-31",
            validity: "Valid",
          },
          {
            conceptId: 2,
            display: "Test Concept 2",
            domainId: "TestDomain",
            system: "TestSystem",
            conceptClassId: "TestClass",
            standardConcept: "S",
            concept: "Standard",
            code: "TEST002",
            validStartDate: "2020-01-01",
            validEndDate: "2099-12-31",
            validity: "Valid",
          },
        ],
        count: 2,
      };

      const props = {
        ...defaultProps,
        conceptsResult: mockResult,
      };

      renderWithRouter(<TerminologyList {...props} />);

      expect(screen.getByText("Rows: 2")).toBeInTheDocument();
      expect(screen.getByText("Test Concept 1")).toBeInTheDocument();
      expect(screen.getByText("Test Concept 2")).toBeInTheDocument();
    });

    it("shows selected concepts when on SELECTED tab", () => {
      const selectedConcepts = [
        {
          conceptId: 1,
          display: "Selected Concept 1",
          domainId: "TestDomain",
          system: "TestSystem",
          conceptClassId: "TestClass",
          standardConcept: "S",
          concept: "Standard",
          code: "SEL001",
          validStartDate: "2020-01-01",
          validEndDate: "2099-12-31",
          validity: "Valid",
        },
        {
          conceptId: 2,
          display: "Selected Concept 2",
          domainId: "TestDomain",
          system: "TestSystem",
          conceptClassId: "TestClass",
          standardConcept: "S",
          concept: "Standard",
          code: "SEL002",
          validStartDate: "2020-01-01",
          validEndDate: "2099-12-31",
          validity: "Valid",
        },
      ];

      const props = {
        ...defaultProps,
        tab: "SELECTED" as const,
        selectedConcepts,
        isConceptSet: true,
      };

      renderWithRouter(<TerminologyList {...props} />);

      expect(screen.getByText("Rows: 2")).toBeInTheDocument();
    });
  });
});
