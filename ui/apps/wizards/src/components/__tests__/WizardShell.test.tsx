import { useEffect } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { renderHook, act } from "@testing-library/react";
import { WizardShell } from "../WizardShell";
import { WizardProvider, useWizardContext } from "../../context/WizardContext";

// Mock the wizard definitions module
vi.mock("../../config/wizardDefinitions", () => ({
  getWizardById: vi.fn((id: string) => {
    if (id === "test-wizard") {
      return Promise.resolve({
        id: "test-wizard",
        name: "Test Wizard",
        description: "A test wizard",
        fields: [],
        resultActions: [],
        steps: [
          { id: "intro", type: "intro", title: "Introduction" },
          { id: "form", type: "form", title: "Form" },
          { id: "results", type: "results", title: "Results" },
        ],
      });
    }
    if (id === "single-step-wizard") {
      return Promise.resolve({
        id: "single-step-wizard",
        name: "Single Step Wizard",
        description: "A single-step wizard",
        fields: [],
        resultActions: [],
        steps: [{ id: "intro", type: "intro", title: "Introduction" }],
      });
    }
    return Promise.reject(new Error("Wizard not found"));
  }),
  getWizardDefinitions: vi.fn(() => Promise.resolve([])),
}));

describe("WizardShell", () => {
  describe("Step Type Registry", () => {
    it("should render StepSelection component for selection step type", () => {
      render(
        <WizardProvider>
          <WizardShell />
        </WizardProvider>,
      );

      // StepSelection renders "Getting started"
      expect(screen.getByText("Getting started")).toBeInTheDocument();
    });

    it("should render StepIntro component for intro step type", async () => {
      const { result } = renderHook(() => useWizardContext(), {
        wrapper: ({ children }) => <WizardProvider>{children}</WizardProvider>,
      });

      // Select wizard and navigate to first step
      await act(async () => {
        await result.current.selectWizard("test-wizard");
      });

      render(
        <WizardProvider>
          <TestWrapperIntro />
        </WizardProvider>,
      );

      // StepIntro renders the step title
      await waitFor(() => {
        expect(screen.getByText("Introduction")).toBeInTheDocument();
      });
    });

    it("should render StepForm component for form step type", async () => {
      render(
        <WizardProvider>
          <TestWrapperForm />
        </WizardProvider>,
      );

      // StepForm renders the step title
      await waitFor(() => {
        expect(screen.getByText("Form")).toBeInTheDocument();
      });
    });

    it("should render StepResults component for results step type", async () => {
      render(
        <WizardProvider>
          <TestWrapperResults />
        </WizardProvider>,
      );

      // StepResults renders the step title
      await waitFor(() => {
        expect(screen.getByText("Results")).toBeInTheDocument();
      });
    });

    it("should handle step navigation and render correct component", async () => {
      const TestComponent = () => {
        const { selectWizard, goForward, currentStepIndex } = useWizardContext();

        useEffect(() => {
          selectWizard("test-wizard");
        }, []);

        return (
          <div>
            <WizardShell />
            <button onClick={goForward}>Next</button>
            <div data-testid="step-index">{currentStepIndex}</div>
          </div>
        );
      };

      render(
        <WizardProvider>
          <TestComponent />
        </WizardProvider>,
      );

      // Wait for wizard to load and show intro step
      await waitFor(() => {
        expect(screen.getByText("Introduction")).toBeInTheDocument();
      });

      // Verify we're on step 0
      expect(screen.getByTestId("step-index")).toHaveTextContent("0");
    });
  });

  describe("Breadcrumb", () => {
    it("should show breadcrumb on selection page", () => {
      render(
        <WizardProvider>
          <WizardShell />
        </WizardProvider>,
      );

      expect(screen.getByText("Home")).toBeInTheDocument();
      expect(screen.getByText("Cohort Wizards")).toBeInTheDocument();
    });

    it("should have accessible breadcrumb navigation structure", () => {
      render(
        <WizardProvider>
          <WizardShell />
        </WizardProvider>,
      );

      const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
      expect(nav).toBeInTheDocument();

      const currentPage = screen.getByText("Cohort Wizards");
      expect(currentPage).toHaveAttribute("aria-current", "page");
    });

    it("should show breadcrumb on form page", async () => {
      const TestComponent = () => {
        const { selectWizard } = useWizardContext();

        useEffect(() => {
          selectWizard("test-wizard");
        }, []);

        return <WizardShell />;
      };

      render(
        <WizardProvider>
          <TestComponent />
        </WizardProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText("Introduction")).toBeInTheDocument();
      });

      expect(screen.getByText("Home")).toBeInTheDocument();
      expect(screen.getByText("Cohort Wizards")).toBeInTheDocument();
    });

    it("should navigate to selection when Home is clicked", async () => {
      const TestComponent = () => {
        const { selectWizard, currentStepIndex } = useWizardContext();

        useEffect(() => {
          selectWizard("test-wizard");
        }, []);

        return (
          <div>
            <WizardShell />
            <div data-testid="step-index">{currentStepIndex}</div>
          </div>
        );
      };

      render(
        <WizardProvider>
          <TestComponent />
        </WizardProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText("Introduction")).toBeInTheDocument();
      });

      const homeButton = screen.getByText("Home");
      homeButton.click();

      await waitFor(() => {
        expect(screen.getByTestId("step-index")).toHaveTextContent("-1");
      });

      expect(screen.getByText("Getting started")).toBeInTheDocument();
    });
  });

  describe("Error Handling", () => {
    it("should show error when stepConfig is null but wizard is selected", async () => {
      const TestComponent = () => {
        const { selectWizard, setCurrentStepIndex } = useWizardContext();

        useEffect(() => {
          selectWizard("test-wizard").then(() => {
            // Jump to invalid step index
            setCurrentStepIndex(99);
          });
        }, []);

        return <WizardShell />;
      };

      render(
        <WizardProvider>
          <TestComponent />
        </WizardProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText("Configuration Error")).toBeInTheDocument();
      });

      expect(screen.getByText(/Unable to load step configuration/)).toBeInTheDocument();
    });

    it("should render error state gracefully with reset option", async () => {
      const TestComponent = () => {
        const { selectWizard, setCurrentStepIndex } = useWizardContext();

        useEffect(() => {
          selectWizard("test-wizard").then(() => {
            setCurrentStepIndex(99);
          });
        }, []);

        return <WizardShell />;
      };

      render(
        <WizardProvider>
          <TestComponent />
        </WizardProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText("Back to Selection")).toBeInTheDocument();
      });
    });

    it("should redirect to selection when index > -1 but no wizard selected", async () => {
      const TestComponent = () => {
        const { setCurrentStepIndex, currentStepIndex } = useWizardContext();

        // Try to navigate to step 1 without selecting a wizard
        useEffect(() => {
          setCurrentStepIndex(1);
        }, []);

        return (
          <div>
            <WizardShell />
            <div data-testid="step-index">{currentStepIndex}</div>
          </div>
        );
      };

      render(
        <WizardProvider>
          <TestComponent />
        </WizardProvider>,
      );

      // Should redirect back to -1 (selection page)
      await waitFor(() => {
        expect(screen.getByTestId("step-index")).toHaveTextContent("-1");
      });

      // Should show selection page
      expect(screen.getByText("Getting started")).toBeInTheDocument();
    });
  });
});

// Test helper components that select wizard and navigate to specific steps
function TestWrapperIntro() {
  const { selectWizard } = useWizardContext();

  useEffect(() => {
    selectWizard("test-wizard");
  }, []);

  return <WizardShell />;
}

function TestWrapperForm() {
  const { selectWizard, setCurrentStepIndex } = useWizardContext();

  useEffect(() => {
    selectWizard("test-wizard").then(() => {
      setCurrentStepIndex(1);
    });
  }, []);

  return <WizardShell />;
}

function TestWrapperResults() {
  const { selectWizard, setCurrentStepIndex } = useWizardContext();

  useEffect(() => {
    selectWizard("test-wizard").then(() => {
      setCurrentStepIndex(2);
    });
  }, []);

  return <WizardShell />;
}
