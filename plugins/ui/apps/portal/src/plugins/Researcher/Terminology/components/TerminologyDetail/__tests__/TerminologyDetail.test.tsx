import React from "react";
import { screen, render, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import TerminologyDetail from "../TerminologyDetail";
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
  const mockGetRecommendedConcepts = jest.fn();
  const mockGetTerminologyConnections = jest.fn();

  return {
    terminologyApi: {
      getRecommendedConcepts: mockGetRecommendedConcepts,
      getTerminologyConnections: mockGetTerminologyConnections,
    },
    mockGetRecommendedConcepts,
    mockGetTerminologyConnections,
  };
});

// Mock ConceptHierarchy component to simplify testing
jest.mock("../../ConceptHierarchy/ConceptHierarchy", () => {
  return function MockConceptHierarchy() {
    return <div data-testid="concept-hierarchy">Mocked Concept Hierarchy</div>;
  };
});

const renderWithRouter = (component: React.ReactElement) => {
  return render(<MemoryRouter>{component}</MemoryRouter>);
};

// Get the mock functions from the mocked module
const { mockGetRecommendedConcepts, mockGetTerminologyConnections } = jest.requireMock(
  "../../../../../../axios/terminology"
);

describe("TerminologyDetail Component", () => {
  const defaultProps = {
    setShowDetails: jest.fn(),
    conceptId: 123456,
    setConceptId: jest.fn(),
    userId: "test-user",
    datasetId: "test-dataset",
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up default mock implementations
    mockGetRecommendedConcepts.mockResolvedValue([]);
    mockGetTerminologyConnections.mockResolvedValue({
      group: [
        {
          element: [
            {
              valueSet: {
                expansion: {
                  contains: [
                    {
                      conceptId: 123456,
                      display: "Test Concept",
                      code: "TEST001",
                      system: "TestSystem",
                    },
                  ],
                },
              },
              target: [],
            },
          ],
        },
      ],
    });
  });

  describe("Basic Rendering", () => {
    it("renders without crashing", () => {
      renderWithRouter(<TerminologyDetail {...defaultProps} />);

      // Should render tabs
      expect(screen.getByRole("tablist")).toBeInTheDocument();
    });

    it("renders close button", () => {
      renderWithRouter(<TerminologyDetail {...defaultProps} />);

      const closeButton = screen.getByTestId("CloseIcon");
      expect(closeButton).toBeInTheDocument();
    });

    it("calls setShowDetails when close button is clicked", () => {
      renderWithRouter(<TerminologyDetail {...defaultProps} />);

      // Find the button containing the CloseIcon
      const closeButton = screen.getByTestId("CloseIcon").closest("button");
      expect(closeButton).toBeInTheDocument();

      fireEvent.click(closeButton!);

      expect(defaultProps.setShowDetails).toHaveBeenCalledWith(false);
    });

    it("renders concept hierarchy when hierarchy tab is active", () => {
      renderWithRouter(<TerminologyDetail {...defaultProps} />);

      // Find and click hierarchy tab
      const hierarchyTab = screen.getByText("TERMINOLOGY_DETAIL__HIERARCHY");
      fireEvent.click(hierarchyTab);

      expect(screen.getByTestId("concept-hierarchy")).toBeInTheDocument();
    });
  });

  // Phase 2 Tests: Component Behavior
  describe("Tab Navigation Behavior", () => {
    it("switches between tabs correctly", () => {
      renderWithRouter(<TerminologyDetail {...defaultProps} />);

      // Initially, the Related Concepts tab should be selected (based on test output)
      const relatedTab = screen.getByText("TERMINOLOGY_DETAIL__RELATED_CONCEPTS");
      const hierarchyTab = screen.getByText("TERMINOLOGY_DETAIL__HIERARCHY");

      expect(relatedTab).toHaveAttribute("aria-selected", "true");
      expect(hierarchyTab).toHaveAttribute("aria-selected", "false");

      // Click hierarchy tab
      fireEvent.click(hierarchyTab);

      expect(hierarchyTab).toHaveAttribute("aria-selected", "true");
      expect(relatedTab).toHaveAttribute("aria-selected", "false");
      expect(screen.getByTestId("concept-hierarchy")).toBeInTheDocument();
    });

    it("shows correct content for each tab", () => {
      renderWithRouter(<TerminologyDetail {...defaultProps} />);

      // Related Concepts tab should show connections table
      expect(screen.getByText("TERMINOLOGY_DETAIL__RELATIONSHIP")).toBeInTheDocument();
      expect(screen.getByText("TERMINOLOGY_DETAIL__RELATES_TO")).toBeInTheDocument();
      expect(screen.getByText("TERMINOLOGY_DETAIL__CONCEPT_ID")).toBeInTheDocument();
      expect(screen.getByText("TERMINOLOGY_DETAIL__VOCABULARY")).toBeInTheDocument();

      // Switch to hierarchy tab
      const hierarchyTab = screen.getByText("TERMINOLOGY_DETAIL__HIERARCHY");
      fireEvent.click(hierarchyTab);

      // Hierarchy tab should show the mocked hierarchy component
      expect(screen.getByTestId("concept-hierarchy")).toBeInTheDocument();
    });

    it("resets to default tab state on rerender", () => {
      const { rerender } = renderWithRouter(<TerminologyDetail {...defaultProps} />);

      // Switch to hierarchy tab
      const hierarchyTab = screen.getByText("TERMINOLOGY_DETAIL__HIERARCHY");
      fireEvent.click(hierarchyTab);
      expect(hierarchyTab).toHaveAttribute("aria-selected", "true");

      // Rerender with same props - this will reset component state
      rerender(<TerminologyDetail {...defaultProps} />);

      // Should reset to default tab (Related Concepts)
      const relatedTab = screen.getByText("TERMINOLOGY_DETAIL__RELATED_CONCEPTS");
      expect(relatedTab).toHaveAttribute("aria-selected", "true");
    });
  });

  describe("Component Stability", () => {
    it("renders without crashing with various prop combinations", () => {
      // Test with different prop combinations
      const testCases = [
        { ...defaultProps },
        { ...defaultProps, conceptId: 0 },
        { ...defaultProps, datasetId: "" },
        { ...defaultProps, conceptId: 999999, datasetId: "different-dataset" },
      ];

      testCases.forEach((props, index) => {
        expect(() => {
          const { unmount } = renderWithRouter(<TerminologyDetail {...props} />);
          expect(screen.getByRole("tablist")).toBeInTheDocument();
          unmount();
        }).not.toThrow();
      });
    });

    it("handles component lifecycle correctly", () => {
      const { unmount } = renderWithRouter(<TerminologyDetail {...defaultProps} />);

      // Component should render successfully
      expect(screen.getByRole("tablist")).toBeInTheDocument();
      // Table is present but hidden, so check by class instead
      expect(document.querySelector(".MuiTable-root")).toBeInTheDocument();

      // Should unmount without errors
      expect(() => unmount()).not.toThrow();
    });
  });

  describe("UI Structure and Content", () => {
    it("displays table headers correctly", () => {
      renderWithRouter(<TerminologyDetail {...defaultProps} />);

      // Should show the table with proper headers
      expect(screen.getByText("TERMINOLOGY_DETAIL__RELATIONSHIP")).toBeInTheDocument();
      expect(screen.getByText("TERMINOLOGY_DETAIL__RELATES_TO")).toBeInTheDocument();
      expect(screen.getByText("TERMINOLOGY_DETAIL__CONCEPT_ID")).toBeInTheDocument();
      expect(screen.getByText("TERMINOLOGY_DETAIL__VOCABULARY")).toBeInTheDocument();
    });

    it("shows table structure in related concepts tab", () => {
      renderWithRouter(<TerminologyDetail {...defaultProps} />);

      // Should show empty table structure by default (table is hidden but present)
      const table = document.querySelector(".MuiTable-root");
      expect(table).toBeInTheDocument();
      const tableBody = table?.querySelector("tbody");
      expect(tableBody).toBeInTheDocument();
    });

    it("displays concept hierarchy when hierarchy tab is selected", () => {
      renderWithRouter(<TerminologyDetail {...defaultProps} />);

      // Switch to hierarchy tab
      const hierarchyTab = screen.getByText("TERMINOLOGY_DETAIL__HIERARCHY");
      fireEvent.click(hierarchyTab);

      // Should show the mocked hierarchy component
      expect(screen.getByTestId("concept-hierarchy")).toBeInTheDocument();
    });
  });

  describe("User Interaction Behavior", () => {
    it("handles close button click correctly", () => {
      renderWithRouter(<TerminologyDetail {...defaultProps} />);

      const closeButton = screen.getByTestId("CloseIcon").closest("button");
      fireEvent.click(closeButton!);

      expect(defaultProps.setShowDetails).toHaveBeenCalledWith(false);
    });

    it("maintains component state during tab interactions", () => {
      renderWithRouter(<TerminologyDetail {...defaultProps} />);

      // Initially, Related Concepts tab should be selected
      const relatedTab = screen.getByText("TERMINOLOGY_DETAIL__RELATED_CONCEPTS");
      const hierarchyTab = screen.getByText("TERMINOLOGY_DETAIL__HIERARCHY");

      expect(relatedTab).toHaveAttribute("aria-selected", "true");
      expect(document.querySelector(".MuiTable-root")).toBeInTheDocument();

      // Switch to hierarchy tab
      fireEvent.click(hierarchyTab);

      expect(hierarchyTab).toHaveAttribute("aria-selected", "true");
      expect(relatedTab).toHaveAttribute("aria-selected", "false");
      expect(screen.getByTestId("concept-hierarchy")).toBeInTheDocument();

      // Switch back to related concepts tab
      fireEvent.click(relatedTab);

      expect(relatedTab).toHaveAttribute("aria-selected", "true");
      expect(hierarchyTab).toHaveAttribute("aria-selected", "false");
      expect(document.querySelector(".MuiTable-root")).toBeInTheDocument();
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("handles missing or invalid conceptId gracefully", () => {
      const invalidProps = { ...defaultProps, conceptId: 0 };

      expect(() => {
        renderWithRouter(<TerminologyDetail {...invalidProps} />);
      }).not.toThrow();

      expect(screen.getByRole("tablist")).toBeInTheDocument();
      expect(document.querySelector(".MuiTable-root")).toBeInTheDocument();
    });

    it("handles missing datasetId gracefully", () => {
      const invalidProps = { ...defaultProps, datasetId: "" };

      expect(() => {
        renderWithRouter(<TerminologyDetail {...invalidProps} />);
      }).not.toThrow();

      expect(screen.getByRole("tablist")).toBeInTheDocument();
      expect(document.querySelector(".MuiTable-root")).toBeInTheDocument();
    });

    it("renders consistently with different prop values", () => {
      const variations = [
        { ...defaultProps, conceptId: 999999 },
        { ...defaultProps, datasetId: "another-dataset" },
        { ...defaultProps, userId: "different-user" },
      ];

      variations.forEach((props) => {
        const { unmount } = renderWithRouter(<TerminologyDetail {...props} />);

        expect(screen.getByRole("tablist")).toBeInTheDocument();
        expect(document.querySelector(".MuiTable-root")).toBeInTheDocument();
        expect(screen.getByTestId("CloseIcon")).toBeInTheDocument();

        unmount();
      });
    });
  });
});
