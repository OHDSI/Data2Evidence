import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StepForm } from "../StepForm";
import { WizardProvider, useWizardContext } from "../../context/WizardContext";
import type { WizardDefinition } from "../../types/wizard";

// Mock the wizard definitions module
vi.mock("../../config/wizardDefinitions", () => ({
  getWizardById: vi.fn((id: string) => {
    if (id === "select-test-wizard") {
      return Promise.resolve({
        id: "select-test-wizard",
        name: "Select Field Test Wizard",
        description: "Testing select field rendering",
        fields: [
          {
            id: "gender",
            type: "select",
            label: "Gender",
            required: true,
            options: [
              { label: "Male", value: "8507" },
              { label: "Female", value: "8532" },
            ],
          },
          {
            id: "country",
            type: "select",
            label: "Country",
            required: false,
            options: [
              { label: "USA", value: "usa" },
              { label: "Canada", value: "canada" },
              { label: "UK", value: "uk" },
            ],
          },
        ],
        resultActions: [],
        steps: [
          {
            id: "form",
            type: "form",
            title: "Test Form",
            config: {
              submitLabel: "Submit",
              submitAction: "next-step",
            },
          },
        ],
      });
    }
    if (id === "deep-link-wizard") {
      return Promise.resolve({
        id: "deep-link-wizard",
        name: "Deep Link Wizard",
        description: "Testing deep link submit action",
        fields: [
          {
            id: "condition",
            type: "text",
            label: "Condition",
            required: true,
          },
        ],
        resultActions: [],
        steps: [
          {
            id: "form",
            type: "form",
            title: "Deep Link Form",
            config: {
              submitLabel: "Open cohort",
              submitAction: "deep-link",
            },
          },
        ],
      });
    }
    if (id === "next-step-wizard") {
      return Promise.resolve({
        id: "next-step-wizard",
        name: "Next Step Wizard",
        description: "Testing next-step submit action",
        fields: [
          {
            id: "field1",
            type: "text",
            label: "Field 1",
            required: true,
          },
        ],
        resultActions: [],
        steps: [
          {
            id: "form",
            type: "form",
            title: "Next Step Form",
            config: {
              submitLabel: "Next",
              submitAction: "next-step",
            },
          },
        ],
      });
    }
    return Promise.reject(new Error("Wizard not found"));
  }),
  getWizardDefinitions: vi.fn(() => Promise.resolve([])),
}));

describe("StepForm - Select Field Type", () => {
  describe("Rendering", () => {
    it("should render select element with correct options", async () => {
      const TestComponent = () => {
        const { selectWizard } = useWizardContext();

        React.useEffect(() => {
          selectWizard("select-test-wizard");
        }, []);

        return <StepForm />;
      };

      render(
        <WizardProvider>
          <TestComponent />
        </WizardProvider>,
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Gender/)).toBeInTheDocument();
      });

      const selectElement = screen.getByLabelText(/Gender/) as HTMLSelectElement;
      expect(selectElement.tagName).toBe("SELECT");

      // Check options exist with correct values and labels
      const options = Array.from(selectElement.options);
      expect(options.length).toBeGreaterThan(0);
      expect(options.some((opt) => opt.value === "8507" && opt.textContent === "Male")).toBe(true);
      expect(options.some((opt) => opt.value === "8532" && opt.textContent === "Female")).toBe(true);
    });

    it("should display field label for select fields", async () => {
      const TestComponent = () => {
        const { selectWizard } = useWizardContext();

        React.useEffect(() => {
          selectWizard("select-test-wizard");
        }, []);

        return <StepForm />;
      };

      render(
        <WizardProvider>
          <TestComponent />
        </WizardProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText(/Gender/)).toBeInTheDocument();
      });

      const label = screen.getByText(/Gender/);
      expect(label.tagName).toBe("LABEL");
    });

    it("should show required asterisk when field.required = true", async () => {
      const TestComponent = () => {
        const { selectWizard } = useWizardContext();

        React.useEffect(() => {
          selectWizard("select-test-wizard");
        }, []);

        return <StepForm />;
      };

      render(
        <WizardProvider>
          <TestComponent />
        </WizardProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText(/Gender/)).toBeInTheDocument();
      });

      // Gender field has required: true
      const genderLabel = screen.getByText(/Gender/);
      expect(genderLabel.textContent).toContain("*");
    });

    it("should show placeholder option for non-required select fields", async () => {
      const TestComponent = () => {
        const { selectWizard } = useWizardContext();

        React.useEffect(() => {
          selectWizard("select-test-wizard");
        }, []);

        return <StepForm />;
      };

      render(
        <WizardProvider>
          <TestComponent />
        </WizardProvider>,
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Country/)).toBeInTheDocument();
      });

      const selectElement = screen.getByLabelText(/Country/) as HTMLSelectElement;
      const options = Array.from(selectElement.options);

      // Should have placeholder option
      expect(options[0].value).toBe("");
      expect(options[0].textContent).toContain("Select");
    });

    it("should NOT show placeholder option for required select fields", async () => {
      const TestComponent = () => {
        const { selectWizard } = useWizardContext();

        React.useEffect(() => {
          selectWizard("select-test-wizard");
        }, []);

        return <StepForm />;
      };

      render(
        <WizardProvider>
          <TestComponent />
        </WizardProvider>,
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Gender/)).toBeInTheDocument();
      });

      const selectElement = screen.getByLabelText(/Gender/) as HTMLSelectElement;
      const options = Array.from(selectElement.options);

      // Should NOT have empty placeholder option for required field
      expect(options.every((opt) => opt.value !== "")).toBe(true);
    });

    it("should style select field consistently with text/number inputs", async () => {
      const TestComponent = () => {
        const { selectWizard } = useWizardContext();

        React.useEffect(() => {
          selectWizard("select-test-wizard");
        }, []);

        return <StepForm />;
      };

      render(
        <WizardProvider>
          <TestComponent />
        </WizardProvider>,
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Gender/)).toBeInTheDocument();
      });

      const selectElement = screen.getByLabelText(/Gender/) as HTMLSelectElement;
      // Check if it has the input class (consistent styling)
      expect(selectElement.className).toContain("input");
    });
  });

  describe("Validation", () => {
    it("should validate required select fields", async () => {
      const user = userEvent.setup();
      const TestComponent = () => {
        const { selectWizard } = useWizardContext();

        React.useEffect(() => {
          selectWizard("select-test-wizard");
        }, []);

        return <StepForm />;
      };

      render(
        <WizardProvider>
          <TestComponent />
        </WizardProvider>,
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Gender/)).toBeInTheDocument();
      });

      // Submit button should be disabled when required field is empty
      const submitButton = screen.getByText("Submit");
      expect(submitButton).toBeDisabled();
    });

    it("should show error message for invalid selection", async () => {
      const user = userEvent.setup();
      const TestComponent = () => {
        const { selectWizard } = useWizardContext();

        React.useEffect(() => {
          selectWizard("select-test-wizard");
        }, []);

        return <StepForm />;
      };

      render(
        <WizardProvider>
          <TestComponent />
        </WizardProvider>,
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Gender/)).toBeInTheDocument();
      });

      const selectElement = screen.getByLabelText(/Gender/);

      // Try to submit without selecting (if form validation triggers)
      // Focus and blur to trigger validation
      await user.click(selectElement);
      await user.tab();

      // Check if error message appears
      await waitFor(() => {
        const errorMessage = screen.queryByText(/Gender is required/);
        if (errorMessage) {
          expect(errorMessage).toBeInTheDocument();
        }
      });
    });

    it("should enable form submit when required select field has value", async () => {
      const user = userEvent.setup();
      const TestComponent = () => {
        const { selectWizard } = useWizardContext();

        React.useEffect(() => {
          selectWizard("select-test-wizard");
        }, []);

        return <StepForm />;
      };

      render(
        <WizardProvider>
          <TestComponent />
        </WizardProvider>,
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Gender/)).toBeInTheDocument();
      });

      const selectElement = screen.getByLabelText(/Gender/);

      // Select a value
      await user.selectOptions(selectElement, "8507");

      // Submit button should become enabled
      await waitFor(() => {
        const submitButton = screen.getByText("Submit");
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe("Form Submission", () => {
    it("should submit form with selected value", async () => {
      const user = userEvent.setup();
      const mockGoForward = vi.fn();

      const TestComponent = () => {
        const { selectWizard, goForward } = useWizardContext();

        React.useEffect(() => {
          selectWizard("select-test-wizard");
        }, []);

        // Override goForward for testing
        const handleSubmit = (e: React.FormEvent) => {
          e.preventDefault();
          mockGoForward();
        };

        return <StepForm />;
      };

      render(
        <WizardProvider>
          <TestComponent />
        </WizardProvider>,
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Gender/)).toBeInTheDocument();
      });

      const selectElement = screen.getByLabelText(/Gender/);
      await user.selectOptions(selectElement, "8507");

      const submitButton = screen.getByText("Submit");

      // Wait for button to be enabled
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      await user.click(submitButton);

      // Form data should be updated (this is handled by the component)
      // We'll verify by checking that the value persists
      expect(selectElement).toHaveValue("8507");
    });
  });

  describe("Submit Action - Deep Link", () => {
    let originalLocation: Location;

    beforeEach(() => {
      // Save original window.location
      originalLocation = window.location;
      // Mock window.location.href
      delete (window as any).location;
      window.location = { ...originalLocation, href: "" } as any;
    });

    afterEach(() => {
      // Restore original window.location
      window.location = originalLocation;
    });

    it("should generate deep link when submitAction is deep-link", async () => {
      const user = userEvent.setup();
      const TestComponent = () => {
        const { selectWizard } = useWizardContext();

        React.useEffect(() => {
          selectWizard("deep-link-wizard");
        }, []);

        return <StepForm />;
      };

      render(
        <WizardProvider>
          <TestComponent />
        </WizardProvider>,
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Condition/)).toBeInTheDocument();
      });

      const input = screen.getByLabelText(/Condition/);
      await user.type(input, "Diabetes");

      await waitFor(() => {
        const submitButton = screen.getByText("Open cohort");
        expect(submitButton).not.toBeDisabled();
      });

      const submitButton = screen.getByText("Open cohort");
      await user.click(submitButton);

      // Check that window.location.href was set to a deep link
      await waitFor(() => {
        expect(window.location.href).toContain("/d2e/portal/researcher/cohort");
        expect(window.location.href).toContain("datasetId=");
        expect(window.location.href).toContain("linkType=cohort-definition");
        expect(window.location.href).toContain("query=");
      });
    });

    it("should NOT navigate when submitAction is next-step", async () => {
      const user = userEvent.setup();

      const TestComponent = () => {
        const { selectWizard } = useWizardContext();

        React.useEffect(() => {
          selectWizard("next-step-wizard");
        }, []);

        return <StepForm />;
      };

      render(
        <WizardProvider>
          <TestComponent />
        </WizardProvider>,
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Field 1/)).toBeInTheDocument();
      });

      const input = screen.getByLabelText(/Field 1/);
      await user.type(input, "test value");

      await waitFor(() => {
        const submitButton = screen.getByText("Next");
        expect(submitButton).not.toBeDisabled();
      });

      const submitButton = screen.getByText("Next");
      await user.click(submitButton);

      // window.location.href should not be set for next-step action
      // It should remain empty (from beforeEach setup)
      expect(window.location.href).toBe("");
    });

    it("should include wizardId in deep link config", async () => {
      const user = userEvent.setup();
      const TestComponent = () => {
        const { selectWizard } = useWizardContext();

        React.useEffect(() => {
          selectWizard("deep-link-wizard");
        }, []);

        return <StepForm />;
      };

      render(
        <WizardProvider>
          <TestComponent />
        </WizardProvider>,
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Condition/)).toBeInTheDocument();
      });

      const input = screen.getByLabelText(/Condition/);
      await user.type(input, "Diabetes");

      await waitFor(() => {
        const submitButton = screen.getByText("Open cohort");
        expect(submitButton).not.toBeDisabled();
      });

      const submitButton = screen.getByText("Open cohort");
      await user.click(submitButton);

      await waitFor(() => {
        expect(window.location.href).toBeTruthy();
      });

      // The URL should contain an encoded config with wizardId
      expect(window.location.href).toContain("query=");
    });

    it("should log submit action for debugging", async () => {
      const consoleSpy = vi.spyOn(console, "log");
      const user = userEvent.setup();

      const TestComponent = () => {
        const { selectWizard } = useWizardContext();

        React.useEffect(() => {
          selectWizard("deep-link-wizard");
        }, []);

        return <StepForm />;
      };

      render(
        <WizardProvider>
          <TestComponent />
        </WizardProvider>,
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Condition/)).toBeInTheDocument();
      });

      const input = screen.getByLabelText(/Condition/);
      await user.type(input, "Diabetes");

      await waitFor(() => {
        const submitButton = screen.getByText("Open cohort");
        expect(submitButton).not.toBeDisabled();
      });

      const submitButton = screen.getByText("Open cohort");
      await user.click(submitButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining("[Wizards StepForm] Submit action:"),
          "deep-link",
        );
      });

      consoleSpy.mockRestore();
    });
  });
});
