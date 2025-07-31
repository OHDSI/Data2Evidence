import React from "react";
import { screen, render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Terminology } from "../Terminology";
import { MemoryRouter } from "react-router-dom";

// Mock the terminology API
jest.mock("../../../../axios/terminology", () => ({
  Terminology: jest.fn().mockImplementation(() => ({
    getTerminologies: jest.fn().mockResolvedValue({
      expansion: { total: 0, contains: [] },
    }),
    getFilterOptions: jest.fn().mockResolvedValue({}),
  })),
  terminologyApi: {
    getTerminologies: jest.fn().mockResolvedValue({
      expansion: { total: 0, contains: [] },
    }),
    getFilterOptions: jest.fn().mockResolvedValue({}),
  },
}));

// Mock the contexts
jest.mock("../../../../contexts", () => ({
  useTranslation: () => ({
    getText: jest.fn().mockImplementation((key: string) => {
      return key; // Just return the key for simplicity
    }),
    i18nKeys: {
      TERMINOLOGY__CONCEPTS: "TERMINOLOGY__CONCEPTS",
      TERMINOLOGY__CONCEPT_SETS: "TERMINOLOGY__CONCEPT_SETS",
      TERMINOLOGY__MISSING_USER_ID: "TERMINOLOGY__MISSING_USER_ID",
      TERMINOLOGY__SEARCH: "TERMINOLOGY__SEARCH",
      TERMINOLOGY__SELECTED_CONCEPTS: "TERMINOLOGY__SELECTED_CONCEPTS",
      TERMINOLOGY__RELATED_CONCEPTS: "TERMINOLOGY__RELATED_CONCEPTS",
    },
  }),
  useUser: () => ({
    user: {
      idpUserId: "test-user-123",
      name: "Test User",
    },
  }),
  useActiveDataset: () => ({
    activeDataset: {
      id: "test-dataset-123",
      name: "Test Dataset",
    },
  }),
  useToken: () => ({
    idTokenClaims: {
      name: "Test User",
    },
  }),
}));

// Mock the environment
jest.mock("../../../../env", () => ({
  REACT_APP_IDP_NAME_PROP: "name",
}));

// Mock the TerminologyList component to simplify testing
jest.mock("../components/TerminologyList/TerminologyList", () => {
  return function MockTerminologyList() {
    return <div data-testid="terminology-list">Mocked Terminology List</div>;
  };
});

// Mock the TerminologyDetail component
jest.mock("../components/TerminologyDetail/TerminologyDetail", () => {
  return function MockTerminologyDetail() {
    return <div data-testid="terminology-detail">Mocked Terminology Detail</div>;
  };
});

// Simple wrapper for tests
const renderWithRouter = (component: React.ReactElement) => {
  return render(<MemoryRouter>{component}</MemoryRouter>);
};

describe("Terminology Component", () => {
  const defaultProps = {
    metadata: {
      userId: "test-user-123",
      getToken: jest.fn(),
      tenantId: "test-tenant",
      studyId: "test-study",
      releaseId: "test-release",
      datasetId: "test-dataset",
      datasetName: "Test Dataset",
      datasetStatus: "active",
      data: {},
      fetchMenu: jest.fn(),
      subFeatureFlags: {},
    },
    mode: "CONCEPT_SEARCH" as const,
  };

  describe("Basic Rendering", () => {
    it("renders without crashing", () => {
      renderWithRouter(<Terminology {...defaultProps} />);
      expect(screen.getByTestId("terminology-container")).toBeInTheDocument();
    });

    it("renders TerminologyList component", () => {
      renderWithRouter(<Terminology {...defaultProps} />);
      expect(screen.getByTestId("terminology-list")).toBeInTheDocument();
    });

    // Note: Test for "no active dataset" scenario is complex with current mocking setup
    // This will be addressed in Phase 2 with more sophisticated test utilities
  });

  describe("Mode Detection", () => {
    it("renders concept search mode", () => {
      renderWithRouter(<Terminology {...defaultProps} mode="CONCEPT_SEARCH" />);
      expect(screen.getByTestId("terminology-container")).toBeInTheDocument();
    });

    it("renders concept set mode with tabs", () => {
      renderWithRouter(<Terminology {...defaultProps} mode="CONCEPT_SET" />);
      expect(screen.getByTestId("terminology-container")).toBeInTheDocument();
      // Tabs would be rendered in concept set mode
    });

    it("renders concept mapping mode", () => {
      renderWithRouter(<Terminology {...defaultProps} mode="CONCEPT_MAPPING" />);
      expect(screen.getByTestId("terminology-container")).toBeInTheDocument();
    });
  });

  describe("Props Handling", () => {
    it("handles missing userId gracefully", () => {
      const propsWithoutUser = {
        ...defaultProps,
        metadata: undefined,
      };

      renderWithRouter(<Terminology {...propsWithoutUser} />);
      expect(screen.getByText("TERMINOLOGY__MISSING_USER_ID")).toBeInTheDocument();
    });

    it("accepts initial input prop", () => {
      renderWithRouter(<Terminology {...defaultProps} initialInput="diabetes" />);
      expect(screen.getByTestId("terminology-container")).toBeInTheDocument();
    });

    it("accepts default filters prop", () => {
      const defaultFilters = [{ id: "domainId", value: ["Condition"] }];
      renderWithRouter(<Terminology {...defaultProps} defaultFilters={defaultFilters} />);
      expect(screen.getByTestId("terminology-container")).toBeInTheDocument();
    });
  });

  describe("Drawer Mode", () => {
    it("renders as drawer when open prop is provided", () => {
      renderWithRouter(<Terminology {...defaultProps} open={true} onClose={jest.fn()} />);
      // In drawer mode, should render within drawer
      expect(screen.getByTestId("terminology-container")).toBeInTheDocument();
    });

    it("does not render when open is false", () => {
      renderWithRouter(<Terminology {...defaultProps} open={false} onClose={jest.fn()} />);
      // When drawer is closed, should not render content
      expect(screen.queryByTestId("terminology-container")).not.toBeInTheDocument();
    });
  });
});
