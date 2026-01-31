import { useWizardContext } from "../context/WizardContext";
import { ErrorBoundary } from "./ErrorBoundary";
import { Step1Selection } from "./Step1Selection";
import { Step2Introduction } from "./Step2Introduction";
import { Step3Form } from "./Step3Form";
import { Step4Results } from "./Step4Results";
import styles from "./WizardShell.module.css";

export function WizardShell() {
  const { currentStepIndex, selectedWizard, setCurrentStepIndex, resetWizard } = useWizardContext();

  const renderStep = () => {
    // Selection page (index -1)
    if (currentStepIndex === -1) {
      return <Step1Selection />;
    }

    // If index > -1 but no wizard selected, redirect to selection
    if (currentStepIndex > -1 && !selectedWizard) {
      console.warn("[Wizards] No wizard selected, redirecting to selection page");
      setCurrentStepIndex(-1);
      return <Step1Selection />;
    }

    switch (currentStepIndex) {
      case 0:
        return <Step2Introduction />;
      case 1:
        return <Step3Form />;
      case 2:
        return <Step4Results />;
      default:
        return null;
    }
  };

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <h1 className={styles.title}>Wizards</h1>
        <p className={styles.progress}>
          Step {currentStepIndex + 1} of {selectedWizard?.steps?.length ?? 3}
        </p>
      </header>
      <main className={styles.content}>
        <ErrorBoundary onReset={resetWizard}>{renderStep()}</ErrorBoundary>
      </main>
    </div>
  );
}
