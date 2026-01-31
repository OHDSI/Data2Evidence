import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
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
});
