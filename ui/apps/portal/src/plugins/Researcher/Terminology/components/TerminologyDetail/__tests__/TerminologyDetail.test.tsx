import { screen, render, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import TerminologyDetail from "../TerminologyDetail";
import { MemoryRouter } from "react-router-dom";

// Mock contexts
jest.mock("../../../../../../contexts", () => ({
  useTranslation: () => ({
    getText: (key: string) => key,
    i18nKeys: {},
  }),
  useFeedback: () => ({
    setFeedback: jest.fn(),
  }),
}));

// Mock response - set in beforeEach for each test group
let mockResponse: unknown = null;

// Mock terminology API
jest.mock("../../../../../../axios/terminology", () => ({
  Terminology: function () {
    return {
      getRecommendedConcepts: () => Promise.resolve([]),
      getTerminologyConnections: () => Promise.resolve(mockResponse),
    };
  },
}));

// Mock ConceptHierarchy
jest.mock("../../ConceptHierarchy/ConceptHierarchy", () => {
  return function MockConceptHierarchy() {
    return <div data-testid="concept-hierarchy">Mocked Concept Hierarchy</div>;
  };
});

// Helper to render with router
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

// Mock API responses
const standardConcept = {
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
                  concept: "Standard",
                },
              ],
            },
          },
          target: [],
        },
      ],
    },
  ],
};

const nonStandardConcept = {
  group: [
    {
      element: [
        {
          valueSet: {
            expansion: {
              contains: [
                {
                  conceptId: 789012,
                  display: "Non-standard Concept",
                  code: "NS001",
                  system: "TestSystem",
                  concept: "Non-standard",
                },
              ],
            },
          },
          target: [{ code: 111111, display: "Related Concept", equivalence: "Maps to", vocabularyId: "SNOMED" }],
        },
      ],
    },
  ],
};

const standardWithConnections = {
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
                  concept: "Standard",
                },
              ],
            },
          },
          target: [{ code: 999999, display: "Related Concept Name", equivalence: "Maps to", vocabularyId: "ICD10" }],
        },
      ],
    },
  ],
};

describe("TerminologyDetail Component", () => {
  beforeEach(() => {
    mockResponse = null;
  });

  afterEach(() => {
    cleanup();
  });

  it("renders without API call when datasetId is missing", () => {
    renderComponent({ datasetId: "" });

    expect(screen.queryByTestId("loader")).not.toBeInTheDocument();
    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(screen.getByText("No records to display")).toBeInTheDocument();
    expect(screen.queryByText("TERMINOLOGY_DETAIL__HIERARCHY")).not.toBeInTheDocument();
  });

  it("renders standard concept with both tabs", async () => {
    mockResponse = standardConcept;
    renderComponent();

    await screen.findByRole("tablist");

    expect(screen.getByText("TERMINOLOGY_DETAIL__HIERARCHY")).toBeInTheDocument();
    expect(screen.getByText("TERMINOLOGY_DETAIL__RELATED_CONCEPTS")).toBeInTheDocument();
    expect(screen.getByText("TERMINOLOGY_DETAIL__RELATED_CONCEPTS")).toHaveAttribute("aria-selected", "true");
  });

  it("hides Hierarchy tab for non-standard concepts", async () => {
    mockResponse = nonStandardConcept;
    renderComponent();

    await screen.findByRole("tablist");

    expect(screen.queryByText("TERMINOLOGY_DETAIL__HIERARCHY")).not.toBeInTheDocument();
    expect(screen.getByText("Related Concept")).toBeInTheDocument();
    expect(screen.getByText("Maps to")).toBeInTheDocument();
  });

  it("displays connections and navigates on click", async () => {
    mockResponse = standardWithConnections;
    const { props } = renderComponent();

    await screen.findByRole("tablist");

    expect(screen.getByText("Related Concept Name")).toBeInTheDocument();
    expect(screen.getByText("999999")).toBeInTheDocument();

    const row = screen.getByText("Related Concept Name").closest("tr");
    fireEvent.click(row!);
    expect(props.setConceptId).toHaveBeenCalledWith(999999);
  });

  it("closes panel when close button clicked", async () => {
    mockResponse = standardConcept;
    const { props } = renderComponent();

    await screen.findByRole("tablist");

    const closeButton = screen.getByTestId("CloseIcon").closest("button");
    fireEvent.click(closeButton!);

    expect(props.setShowDetails).toHaveBeenCalledWith(false);
    expect(props.setConceptId).toHaveBeenCalledWith(null);
  });

  it("switches tabs when clicked", async () => {
    mockResponse = standardConcept;
    renderComponent();

    await screen.findByRole("tablist");

    const hierarchyTab = screen.getByText("TERMINOLOGY_DETAIL__HIERARCHY");
    expect(hierarchyTab).toHaveAttribute("aria-selected", "false");

    fireEvent.click(hierarchyTab);

    expect(hierarchyTab).toHaveAttribute("aria-selected", "true");
  });

  it("displays details section and footer when connections exist", async () => {
    mockResponse = standardWithConnections;
    renderComponent();

    await screen.findByRole("tablist");

    expect(screen.getByText("TERMINOLOGY_DETAIL__DETAILS")).toBeInTheDocument();
    expect(screen.getByText(/Currently viewing:/)).toBeInTheDocument();
  });
});
