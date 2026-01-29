import { useWizardContext } from "../context/WizardContext";
import { ErrorBoundary } from "./ErrorBoundary";
import { Step1Selection } from "./Step1Selection";
import { Step2Introduction } from "./Step2Introduction";
import { Step3Form } from "./Step3Form";
import { Step4Results } from "./Step4Results";
import styles from "./WizardShell.module.css";

export function WizardShell() {
  const { currentStep, resetWizard } = useWizardContext();

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1Selection />;
      case 2:
        return <Step2Introduction />;
      case 3:
        return <Step3Form />;
      case 4:
        return <Step4Results />;
      default:
        return null;
    }
  };

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <h1 className={styles.title}>Wizards</h1>
        <p className={styles.progress}>Step {currentStep} of 4</p>
      </header>
      <main className={styles.content}>
        <ErrorBoundary onReset={resetWizard}>{renderStep()}</ErrorBoundary>
      </main>
    </div>
  );
}
