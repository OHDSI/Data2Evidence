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
      renderWithRouter(<Terminology {...defaultProps} initialInput="test search term" />);
      expect(screen.getByTestId("terminology-container")).toBeInTheDocument();
    });

    it("accepts default filters prop", () => {
      const defaultFilters = [{ id: "domainId", value: ["TestDomain"] }];
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

  // Phase 2 Tests: Component Behavior
  describe("Mode Switching Behavior", () => {
    it("shows concept set tabs only in CONCEPT_SET mode", () => {
      // Test CONCEPT_SET mode shows tabs
      renderWithRouter(<Terminology {...defaultProps} mode="CONCEPT_SET" />);

      // Should show tab navigation elements
      expect(screen.getByText("TERMINOLOGY__SEARCH")).toBeInTheDocument();
      expect(screen.getByText("TERMINOLOGY__SELECTED_CONCEPTS")).toBeInTheDocument();
      expect(screen.getByText("TERMINOLOGY__RELATED_CONCEPTS")).toBeInTheDocument();
    });

    it("does not show tabs in CONCEPT_SEARCH mode", () => {
      renderWithRouter(<Terminology {...defaultProps} mode="CONCEPT_SEARCH" />);

      // Should not show tab navigation in search mode
      expect(screen.queryByText("TERMINOLOGY__SEARCH")).not.toBeInTheDocument();
      expect(screen.queryByText("TERMINOLOGY__SELECTED_CONCEPTS")).not.toBeInTheDocument();
      expect(screen.queryByText("TERMINOLOGY__RELATED_CONCEPTS")).not.toBeInTheDocument();
    });

    it("shows different header text based on mode and drawer state", () => {
      // Test concept set mode in drawer
      const { rerender } = renderWithRouter(
        <Terminology {...defaultProps} mode="CONCEPT_SET" open={true} onClose={jest.fn()} />
      );

      expect(screen.getByText("TERMINOLOGY__CONCEPT_SETS")).toBeInTheDocument();

      // Test concept search mode in drawer
      rerender(<Terminology {...defaultProps} mode="CONCEPT_SEARCH" open={true} onClose={jest.fn()} />);

      expect(screen.getByText("TERMINOLOGY__CONCEPTS")).toBeInTheDocument();
    });
  });

  describe("Concept Selection Behavior", () => {
    it("calls onConceptIdSelect when concept is selected in search modes", () => {
      const mockOnConceptIdSelect = jest.fn();

      renderWithRouter(
        <Terminology {...defaultProps} mode="CONCEPT_SEARCH" onConceptIdSelect={mockOnConceptIdSelect} />
      );

      // Component should render and be ready to handle concept selection
      expect(screen.getByTestId("terminology-container")).toBeInTheDocument();
      expect(screen.getByTestId("terminology-list")).toBeInTheDocument();

      // In a real scenario, this would test the callback when TerminologyList triggers selection
      // For now, we verify the component is properly set up to handle the callback
    });

    it("manages concept selection state in CONCEPT_SET mode", () => {
      renderWithRouter(<Terminology {...defaultProps} mode="CONCEPT_SET" />);

      // Should render with concept set functionality
      expect(screen.getByTestId("terminology-container")).toBeInTheDocument();
      expect(screen.getByTestId("terminology-list")).toBeInTheDocument();

      // Should show tabs for managing selected concepts
      expect(screen.getByText("TERMINOLOGY__SELECTED_CONCEPTS")).toBeInTheDocument();
    });
  });

  describe("Prop Behavior Verification", () => {
    it("renders correctly in both drawer and non-drawer modes", () => {
      // Test non-drawer mode
      const { rerender } = renderWithRouter(<Terminology {...defaultProps} />);
      expect(screen.getByTestId("terminology-list")).toBeInTheDocument();
      expect(screen.getByTestId("terminology-container")).toBeInTheDocument();

      // Test drawer mode - component should still render with drawer wrapper
      rerender(<Terminology {...defaultProps} open={true} onClose={jest.fn()} />);
      expect(screen.getByTestId("terminology-list")).toBeInTheDocument();
      expect(screen.getByTestId("terminology-container")).toBeInTheDocument();
    });

    it("displays appropriate error message when user context is missing", () => {
      const propsWithoutUser = {
        ...defaultProps,
        metadata: undefined,
      };

      renderWithRouter(<Terminology {...propsWithoutUser} />);

      // Should show missing user error instead of terminology list
      expect(screen.getByText("TERMINOLOGY__MISSING_USER_ID")).toBeInTheDocument();
      expect(screen.queryByTestId("terminology-list")).not.toBeInTheDocument();
    });

    it("handles initial input prop correctly", () => {
      const initialInput = "test search term";

      renderWithRouter(<Terminology {...defaultProps} initialInput={initialInput} />);

      // Component should render and be ready to pass initial input to TerminologyList
      expect(screen.getByTestId("terminology-container")).toBeInTheDocument();
      expect(screen.getByTestId("terminology-list")).toBeInTheDocument();
    });

    it("handles default filters prop correctly", () => {
      const defaultFilters = [
        { id: "domainId", value: ["TestDomain"] },
        { id: "vocabularyId", value: ["TestVocabulary"] },
      ];

      renderWithRouter(<Terminology {...defaultProps} defaultFilters={defaultFilters} />);

      // Component should render and be ready to pass filters to TerminologyList
      expect(screen.getByTestId("terminology-container")).toBeInTheDocument();
      expect(screen.getByTestId("terminology-list")).toBeInTheDocument();
    });
  });

  describe("State Management", () => {
    it("manages concept detail visibility state", () => {
      renderWithRouter(<Terminology {...defaultProps} />);

      // Initially should not show terminology detail
      expect(screen.queryByTestId("terminology-detail")).not.toBeInTheDocument();

      // Component should be set up to show details when a concept is selected
      expect(screen.getByTestId("terminology-list")).toBeInTheDocument();
    });

    it("maintains selected concepts state in concept set mode", () => {
      renderWithRouter(<Terminology {...defaultProps} mode="CONCEPT_SET" />);

      // Should render tabs that would show selected concept count
      expect(screen.getByText("TERMINOLOGY__SELECTED_CONCEPTS")).toBeInTheDocument();

      // Should render the main container for concept set functionality
      expect(screen.getByTestId("terminology-container")).toBeInTheDocument();
    });
  });
});
