import { useEffect } from "react";
import { useWizardContext } from "../context/WizardContext";
import { ErrorBoundary } from "./ErrorBoundary";
import { StepSelection } from "./StepSelection";
import { StepIntro } from "./StepIntro";
import { StepForm } from "./StepForm";
import { StepResults } from "./StepResults";
import type { StepType } from "../types/wizard";
import styles from "./WizardShell.module.css";

/**
 * Step type registry mapping step types to their corresponding components.
 * This enables config-driven routing where wizards define their flow via step configs.
 */
const stepTypeRegistry: Record<StepType, React.ComponentType> = {
  selection: StepSelection,
  intro: StepIntro,
  form: StepForm,
  results: StepResults,
};

/**
 * Main wizard renderer using step type registry.
 */
export function WizardShell() {
  const { currentStepIndex, selectedWizard, getCurrentStepConfig, setCurrentStepIndex, resetWizard } =
    useWizardContext();

  // Handle invalid state: index > -1 but no wizard selected
  useEffect(() => {
    if (currentStepIndex > -1 && !selectedWizard) {
      console.warn("[Wizards] No wizard selected, redirecting to selection page");
      setCurrentStepIndex(-1);
    }
  }, [currentStepIndex, selectedWizard, setCurrentStepIndex]);

  const renderStep = () => {
    // Selection page (index -1)
    if (currentStepIndex === -1) {
      return <StepSelection />;
    }

    // If index > -1 but no wizard selected, show selection (redirect handled in useEffect)
    if (currentStepIndex > -1 && !selectedWizard) {
      return <StepSelection />;
    }

    // Get the current step configuration from context
    const stepConfig = getCurrentStepConfig();

    // If stepConfig is null or wizard is missing, show error
    if (!stepConfig || !selectedWizard) {
      console.error("[Wizards] Invalid step configuration:", {
        stepConfig,
        selectedWizard: selectedWizard?.id,
        currentStepIndex,
      });
      return (
        <div className={styles.error}>
          <h2>Configuration Error</h2>
          <p>Unable to load step configuration. Please return to the selection page.</p>
          <button onClick={() => setCurrentStepIndex(-1)}>Back to Selection</button>
        </div>
      );
    }

    // Look up the component by step type in the registry
    const StepComponent = stepTypeRegistry[stepConfig.type];

    // Handle unknown step types
    if (!StepComponent) {
      console.error("[Wizards] Unknown step type:", stepConfig.type);
      return (
        <div className={styles.error}>
          <h2>Configuration Error</h2>
          <p>Unknown step type: {stepConfig.type}</p>
          <button onClick={() => setCurrentStepIndex(-1)}>Back to Selection</button>
        </div>
      );
    }

    // Render the component (step components get config from context internally)
    return <StepComponent />;
  };

  return (
    <div className={styles.shell}>
      <main className={styles.content}>
        <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
          <ol className={styles.breadcrumbList}>
            <li>
              <button type="button" className={styles.breadcrumbLink} onClick={resetWizard}>
                Home
              </button>
            </li>
            <li>
              <span className={styles.breadcrumbSeparator} aria-hidden="true">
                {" "}
                /{" "}
              </span>
              <span className={styles.breadcrumbCurrent} aria-current="page">
                Cohort Wizards
              </span>
            </li>
          </ol>
        </nav>
        <ErrorBoundary onReset={resetWizard}>{renderStep()}</ErrorBoundary>
      </main>
    </div>
  );
}
