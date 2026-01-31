import { useWizardContext } from "../context/WizardContext";
import { ErrorBoundary } from "./ErrorBoundary";
import { StepSelection } from "./StepSelection";
import { StepIntro } from "./StepIntro";
import { StepForm } from "./StepForm";
import { StepResults } from "./StepResults";
import styles from "./WizardShell.module.css";

export function WizardShell() {
  const { currentStepIndex, selectedWizard, setCurrentStepIndex, resetWizard } = useWizardContext();

  const renderStep = () => {
    // Selection page (index -1)
    if (currentStepIndex === -1) {
      return <StepSelection />;
    }

    // If index > -1 but no wizard selected, redirect to selection
    if (currentStepIndex > -1 && !selectedWizard) {
      console.warn("[Wizards] No wizard selected, redirecting to selection page");
      setCurrentStepIndex(-1);
      return <StepSelection />;
    }

    switch (currentStepIndex) {
      case 0:
        return <StepIntro />;
      case 1:
        return <StepForm />;
      case 2:
        return <StepResults />;
      default:
        return null;
    }
  };

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <h1 className={styles.title}>Wizards</h1>
        <p className={styles.progress}>
          Step {currentStepIndex + 1} of {selectedWizard?.steps.length ?? 3}
        </p>
      </header>
      <main className={styles.content}>
        <ErrorBoundary onReset={resetWizard}>{renderStep()}</ErrorBoundary>
      </main>
    </div>
  );
}
