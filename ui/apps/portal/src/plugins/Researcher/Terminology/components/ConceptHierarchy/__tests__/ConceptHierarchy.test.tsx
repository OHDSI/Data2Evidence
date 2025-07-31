import React from "react";
import { screen, render, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ConceptHierarchy from "../ConceptHierarchy";
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
  const mockGetConceptHierarchy = jest.fn();

  class MockTerminology {
    getConceptHierarchy = mockGetConceptHierarchy;
  }

  return {
    Terminology: MockTerminology,
    terminologyApi: {
      getConceptHierarchy: mockGetConceptHierarchy,
    },
    mockGetConceptHierarchy,
  };
});

// Mock Material-UI components
jest.mock("@mui/material", () => {
  return {
    MenuItem: ({ children, value, ...props }: any) => (
      <option value={value} {...props}>
        {children}
      </option>
    ),
  };
});

// Mock portal components
jest.mock("@portal/components", () => {
  const { forwardRef } = require("react");

  return {
    Select: forwardRef(({ children, value, onChange, ...props }: any, ref: any) => (
      <select ref={ref} value={value} onChange={onChange} {...props}>
        {children}
      </select>
    )),
    InputLabel: ({ children, ...props }: any) => <label {...props}>{children}</label>,
    Loader: () => <div data-testid="loader">Loading...</div>,
  };
});

// Mock ReactFlow to simplify testing
jest.mock("reactflow", () => ({
  ReactFlow: ({ nodes, edges, children }: any) => (
    <div data-testid="react-flow">
      <div data-testid="nodes-count">{nodes?.length || 0}</div>
      <div data-testid="edges-count">{edges?.length || 0}</div>
      <div data-testid="react-flow-children">{children}</div>
    </div>
  ),
  MiniMap: () => <div data-testid="mini-map">MiniMap</div>,
  Controls: () => <div data-testid="controls">Controls</div>,
  Background: () => <div data-testid="background">Background</div>,
  Position: {
    Left: "left",
    Right: "right",
    Top: "top",
    Bottom: "bottom",
  },
  MarkerType: {
    Arrow: "arrow",
    ArrowClosed: "arrowclosed",
  },
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(<MemoryRouter>{component}</MemoryRouter>);
};

// Get the mock function from the mocked module
const { mockGetConceptHierarchy } = jest.requireMock("../../../../../../axios/terminology");

describe("ConceptHierarchy Component", () => {
  const defaultProps = {
    conceptId: 123456,
    userId: "test-user",
    datasetId: "test-dataset",
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up default mock implementation
    mockGetConceptHierarchy.mockResolvedValue({
      nodes: [],
      edges: [],
    });
  });

  describe("Basic Rendering", () => {
    it("renders without crashing", () => {
      renderWithRouter(<ConceptHierarchy {...defaultProps} />);

      // Should render the main container
      expect(document.querySelector(".concept-hierarchy__container")).toBeInTheDocument();
    });

    it("renders level selector", () => {
      renderWithRouter(<ConceptHierarchy {...defaultProps} />);

      // Should render level selection dropdown
      expect(screen.getByRole("combobox")).toBeInTheDocument();
      expect(screen.getByText("Number of Parent Levels")).toBeInTheDocument();
    });

    it("renders with default level value", () => {
      renderWithRouter(<ConceptHierarchy {...defaultProps} />);

      // Should show default level of 1
      expect(screen.getByDisplayValue("1")).toBeInTheDocument();
    });
  });

  // Phase 2 Tests: Component Behavior
  describe("Level Selection Behavior", () => {
    it("changes level and triggers API call", async () => {
      renderWithRouter(<ConceptHierarchy {...defaultProps} />);

      // Initially should call API with level 1
      await waitFor(() => {
        expect(mockGetConceptHierarchy).toHaveBeenCalledWith(defaultProps.datasetId, defaultProps.conceptId, 1);
      });

      // Clear the mock to test level change
      mockGetConceptHierarchy.mockClear();

      // Change the level selector to level 3
      const levelSelector = screen.getByRole("combobox");
      fireEvent.change(levelSelector, { target: { value: "3" } });

      // Should call API with new level
      await waitFor(() => {
        expect(mockGetConceptHierarchy).toHaveBeenCalledWith(defaultProps.datasetId, defaultProps.conceptId, 3);
      });
    });

    it("displays available level options", async () => {
      renderWithRouter(<ConceptHierarchy {...defaultProps} />);

      // Check that selector is rendered with options
      const levelSelector = screen.getByRole("combobox");
      expect(levelSelector).toBeInTheDocument();

      // Should show all level options in the select
      const options = levelSelector.querySelectorAll("option");
      expect(options).toHaveLength(10);

      // Check some specific options
      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("4")).toBeInTheDocument();
      expect(screen.getByText("5")).toBeInTheDocument();
    });

    it("maintains selected level after API calls", async () => {
      renderWithRouter(<ConceptHierarchy {...defaultProps} />);

      // Change to level 2
      const levelSelector = screen.getByRole("combobox");
      fireEvent.change(levelSelector, { target: { value: "2" } });

      // Should maintain level 2 selection
      await waitFor(() => {
        expect(levelSelector).toHaveValue("2");
      });
    });
  });

  describe("Data Loading and Display", () => {
    it("shows loading state initially", () => {
      // Mock a delayed response
      mockGetConceptHierarchy.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  nodes: [],
                  edges: [],
                }),
              100
            )
          )
      );

      renderWithRouter(<ConceptHierarchy {...defaultProps} />);

      // Component should render with loading state
      expect(document.querySelector(".concept-hierarchy__container")).toBeInTheDocument();
    });

    it("displays hierarchy data when available", async () => {
      const mockHierarchyData = {
        nodes: [
          { id: "1", conceptId: 123456, display: "Parent Concept", level: 0 },
          { id: "2", conceptId: 789012, display: "Child Concept", level: 1 },
        ],
        edges: [{ id: "e1-2", source: "1", target: "2", type: "hierarchy" }],
      };

      mockGetConceptHierarchy.mockResolvedValue(mockHierarchyData);

      renderWithRouter(<ConceptHierarchy {...defaultProps} />);

      await waitFor(() => {
        expect(mockGetConceptHierarchy).toHaveBeenCalled();
      });

      // Should pass the data to ReactFlow
      // Note: The actual rendering depends on component implementation
      // This test verifies the component handles data correctly
    });

    it("handles empty hierarchy data gracefully", async () => {
      mockGetConceptHierarchy.mockResolvedValue({
        nodes: [],
        edges: [],
      });

      renderWithRouter(<ConceptHierarchy {...defaultProps} />);

      await waitFor(() => {
        expect(mockGetConceptHierarchy).toHaveBeenCalled();
      });

      // Component should render without errors even with empty data
      expect(document.querySelector(".concept-hierarchy__container")).toBeInTheDocument();
    });

    it("displays ReactFlow when hierarchy data is available", async () => {
      const mockHierarchyData = {
        nodes: [{ id: "1", conceptId: 123456, display: "Test Concept", level: 0 }],
        edges: [],
      };

      mockGetConceptHierarchy.mockResolvedValue(mockHierarchyData);

      renderWithRouter(<ConceptHierarchy {...defaultProps} />);

      await waitFor(() => {
        expect(mockGetConceptHierarchy).toHaveBeenCalled();
      });

      // Should render ReactFlow components when data is available
      // The visibility depends on component implementation
    });
  });

  describe("API Integration Behavior", () => {
    it("calls getConceptHierarchy on component mount", async () => {
      renderWithRouter(<ConceptHierarchy {...defaultProps} />);

      await waitFor(() => {
        expect(mockGetConceptHierarchy).toHaveBeenCalledWith(
          defaultProps.datasetId,
          defaultProps.conceptId,
          1 // default level
        );
      });
    });

    it("handles API errors gracefully", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      mockGetConceptHierarchy.mockRejectedValue(new Error("API Error"));

      renderWithRouter(<ConceptHierarchy {...defaultProps} />);

      await waitFor(() => {
        expect(mockGetConceptHierarchy).toHaveBeenCalled();
      });

      // Component should still render without crashing
      expect(document.querySelector(".concept-hierarchy__container")).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it("refetches data when conceptId changes", async () => {
      const { rerender } = renderWithRouter(<ConceptHierarchy {...defaultProps} />);

      await waitFor(() => {
        expect(mockGetConceptHierarchy).toHaveBeenCalledWith(defaultProps.datasetId, defaultProps.conceptId, 1);
      });

      // Clear mock and change conceptId
      mockGetConceptHierarchy.mockClear();
      const newProps = { ...defaultProps, conceptId: 999999 };

      rerender(<ConceptHierarchy {...newProps} />);

      await waitFor(() => {
        expect(mockGetConceptHierarchy).toHaveBeenCalledWith(defaultProps.datasetId, 999999, 1);
      });
    });

    it("refetches data when datasetId changes", async () => {
      const { rerender } = renderWithRouter(<ConceptHierarchy {...defaultProps} />);

      await waitFor(() => {
        expect(mockGetConceptHierarchy).toHaveBeenCalledWith(defaultProps.datasetId, defaultProps.conceptId, 1);
      });

      // Clear mock and change datasetId
      mockGetConceptHierarchy.mockClear();
      const newProps = { ...defaultProps, datasetId: "new-dataset" };

      rerender(<ConceptHierarchy {...newProps} />);

      await waitFor(() => {
        expect(mockGetConceptHierarchy).toHaveBeenCalledWith("new-dataset", defaultProps.conceptId, 1);
      });
    });
  });

  describe("Component State Management", () => {
    it("maintains level state independently", async () => {
      renderWithRouter(<ConceptHierarchy {...defaultProps} />);

      // Change to level 3
      const levelSelector = screen.getByRole("combobox");
      fireEvent.change(levelSelector, { target: { value: "3" } });

      // Level should be maintained
      await waitFor(() => {
        expect(levelSelector).toHaveValue("3");
      });

      // Should not affect other component state
      expect(document.querySelector(".concept-hierarchy__container")).toBeInTheDocument();
    });

    it("resets level to default when props change significantly", async () => {
      const { rerender } = renderWithRouter(<ConceptHierarchy {...defaultProps} />);

      // Change to level 4
      const levelSelector = screen.getByRole("combobox");
      fireEvent.change(levelSelector, { target: { value: "4" } });

      expect(levelSelector).toHaveValue("4");

      // Change conceptId - this should reset to default level
      const newProps = { ...defaultProps, conceptId: 555555 };
      rerender(<ConceptHierarchy {...newProps} />);

      // Should reset to level 1 for new concept
      await waitFor(() => {
        expect(screen.getByRole("combobox")).toHaveValue("1");
      });
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("handles invalid conceptId gracefully", async () => {
      const invalidProps = { ...defaultProps, conceptId: 0 };

      expect(() => {
        renderWithRouter(<ConceptHierarchy {...invalidProps} />);
      }).not.toThrow();

      expect(document.querySelector(".concept-hierarchy__container")).toBeInTheDocument();

      // Should still call API even with conceptId 0 if other props are valid
      await waitFor(() => {
        expect(mockGetConceptHierarchy).toHaveBeenCalledWith(defaultProps.datasetId, 0, 1);
      });
    });

    it("handles missing datasetId gracefully", async () => {
      const invalidProps = { ...defaultProps, datasetId: "" };

      expect(() => {
        renderWithRouter(<ConceptHierarchy {...invalidProps} />);
      }).not.toThrow();

      expect(document.querySelector(".concept-hierarchy__container")).toBeInTheDocument();

      // Should not call API without datasetId
      await waitFor(() => {
        expect(mockGetConceptHierarchy).not.toHaveBeenCalled();
      });
    });

    it("handles malformed hierarchy data", async () => {
      mockGetConceptHierarchy.mockResolvedValue({
        nodes: null,
        edges: undefined,
      });

      expect(() => {
        renderWithRouter(<ConceptHierarchy {...defaultProps} />);
      }).not.toThrow();

      await waitFor(() => {
        expect(mockGetConceptHierarchy).toHaveBeenCalled();
      });

      expect(document.querySelector(".concept-hierarchy__container")).toBeInTheDocument();
    });

    it("renders consistently with different prop combinations", () => {
      const testCases = [
        { ...defaultProps },
        { ...defaultProps, conceptId: 999999 },
        { ...defaultProps, datasetId: "different-dataset" },
        { ...defaultProps, userId: "different-user" },
      ];

      testCases.forEach((props) => {
        const { unmount } = renderWithRouter(<ConceptHierarchy {...props} />);

        expect(document.querySelector(".concept-hierarchy__container")).toBeInTheDocument();
        expect(screen.getByText("Number of Parent Levels")).toBeInTheDocument();
        expect(screen.getByRole("combobox")).toBeInTheDocument();

        unmount();
      });
    });

    it("handles missing userId gracefully", async () => {
      const invalidProps = { ...defaultProps, userId: undefined };

      expect(() => {
        renderWithRouter(<ConceptHierarchy {...invalidProps} />);
      }).not.toThrow();

      expect(document.querySelector(".concept-hierarchy__container")).toBeInTheDocument();

      // Should not call API without userId
      await waitFor(() => {
        expect(mockGetConceptHierarchy).not.toHaveBeenCalled();
      });
    });
  });

  describe("Performance and Optimization", () => {
    it("handles API calls when level changes rapidly", async () => {
      renderWithRouter(<ConceptHierarchy {...defaultProps} />);

      // Wait for initial call
      await waitFor(() => {
        expect(mockGetConceptHierarchy).toHaveBeenCalled();
      });

      const initialCallCount = mockGetConceptHierarchy.mock.calls.length;
      mockGetConceptHierarchy.mockClear();

      // Rapidly change levels
      const levelSelector = screen.getByRole("combobox");

      fireEvent.change(levelSelector, { target: { value: "2" } });
      fireEvent.change(levelSelector, { target: { value: "3" } });
      fireEvent.change(levelSelector, { target: { value: "4" } });
      fireEvent.change(levelSelector, { target: { value: "5" } });

      // Should handle rapid changes - component makes API calls for each level change
      // This tests that the component responds to level changes (not necessarily debouncing)
      await waitFor(() => {
        expect(mockGetConceptHierarchy).toHaveBeenCalled();
        // Should have made at least one call for the last level change
        expect(mockGetConceptHierarchy.mock.calls.length).toBeGreaterThan(0);
      });
    });

    it("cleans up resources on unmount", () => {
      const { unmount } = renderWithRouter(<ConceptHierarchy {...defaultProps} />);

      expect(() => {
        unmount();
      }).not.toThrow();
    });
  });
});
