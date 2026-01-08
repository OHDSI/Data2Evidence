import { screen, render, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import TerminologyDetail from "../TerminologyDetail";
import { MemoryRouter } from "react-router-dom";

// Mock response - set before each test
let mockResponse: unknown = null;

jest.mock("../../../../../../contexts", () => ({
  useTranslation: () => ({ getText: (key: string) => key, i18nKeys: {} }),
  useFeedback: () => ({ setFeedback: jest.fn() }),
}));

jest.mock("../../../../../../axios/terminology", () => ({
  Terminology: function () {
    return {
      getRecommendedConcepts: () => Promise.resolve([]),
      getTerminologyConnections: () => Promise.resolve(mockResponse),
    };
  },
}));

// Helper to build mock response
const createMockResponse = (concept: string, target: object[] = []) => ({
  group: [
    {
      element: [
        {
          valueSet: {
            expansion: {
              contains: [{ conceptId: 123456, display: "Test Concept", code: "TEST", system: "Test", concept }],
            },
          },
          target,
        },
      ],
    },
  ],
});

const renderComponent = (props = {}) => {
  const defaultProps = {
    setShowDetails: jest.fn(),
    conceptId: 123456,
    setConceptId: jest.fn(),
    userId: "test-user",
    datasetId: "test-dataset",
    ...props,
  };
  return {
    ...render(
      <MemoryRouter>
        <TerminologyDetail {...defaultProps} />
      </MemoryRouter>
    ),
    props: defaultProps,
  };
};

describe("TerminologyDetail", () => {
  beforeEach(() => {
    mockResponse = null;
  });
  afterEach(cleanup);

  it("renders immediately without API when datasetId missing", () => {
    renderComponent({ datasetId: "" });

    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(screen.getByText("No records to display")).toBeInTheDocument();
    expect(screen.queryByText("TERMINOLOGY_DETAIL__HIERARCHY")).not.toBeInTheDocument();
  });

  it("standard concept: shows both tabs and switches tabs", async () => {
    mockResponse = createMockResponse("Standard");
    renderComponent();

    await screen.findByRole("tablist");

    // Both tabs visible, Related Concepts selected by default
    const hierarchyTab = screen.getByText("TERMINOLOGY_DETAIL__HIERARCHY");
    const relatedTab = screen.getByText("TERMINOLOGY_DETAIL__RELATED_CONCEPTS");
    expect(relatedTab).toHaveAttribute("aria-selected", "true");
    expect(hierarchyTab).toHaveAttribute("aria-selected", "false");

    // Tab switching works
    fireEvent.click(hierarchyTab);
    expect(hierarchyTab).toHaveAttribute("aria-selected", "true");
  });

  it("closes panel when close button clicked", async () => {
    mockResponse = createMockResponse("Standard");
    const { props } = renderComponent();

    await screen.findByRole("tablist");

    expect(screen.queryByText("TERMINOLOGY_DETAIL__HIERARCHY")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("CloseIcon").closest("button")!);
    expect(props.setShowDetails).toHaveBeenCalledWith(false);
    expect(props.setConceptId).toHaveBeenCalledWith(null);
  });

  it("non-standard concept: hides Hierarchy tab, shows related concepts", async () => {
    mockResponse = createMockResponse("Non-standard", [
      { code: 111, display: "Related", equivalence: "Maps to", vocabularyId: "SNOMED" },
    ]);
    renderComponent();

    await screen.findByRole("tablist");

    expect(screen.queryByText("TERMINOLOGY_DETAIL__HIERARCHY")).not.toBeInTheDocument();
    expect(screen.getByText("Related")).toBeInTheDocument();
    expect(screen.getByText("Maps to")).toBeInTheDocument();
  });

  it("with connections: displays data, navigates on click, shows details/footer", async () => {
    mockResponse = createMockResponse("Standard", [
      { code: 999, display: "Connected Concept", equivalence: "Maps to", vocabularyId: "ICD10" },
    ]);
    const { props } = renderComponent();

    await screen.findByRole("tablist");

    // Connection data displayed
    expect(screen.getByText("Connected Concept")).toBeInTheDocument();
    expect(screen.getByText("999")).toBeInTheDocument();

    // Click navigates
    fireEvent.click(screen.getByText("Connected Concept").closest("tr")!);
    expect(props.setConceptId).toHaveBeenCalledWith(999);

    // Details section and footer visible
    expect(screen.getByText("TERMINOLOGY_DETAIL__DETAILS")).toBeInTheDocument();
    expect(screen.getByText(/Currently viewing:/)).toBeInTheDocument();
  });
});
