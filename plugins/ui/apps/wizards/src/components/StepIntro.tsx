import { useWizardContext } from "../context/WizardContext";
import type { IntroStepConfig } from "../types/wizard";
import styles from "./StepIntro.module.css";

/**
 * Introduction step renderer.
 */
export function StepIntro() {
  const { selectedWizard, goBack, goForward, getCurrentStepConfig } = useWizardContext();
  const stepConfig = getCurrentStepConfig();

  if (!selectedWizard) {
    return (
      <div className={styles.container}>
        <div className={styles.section}>
          <p>Error: No wizard selected. Please return to wizard selection.</p>
        </div>
      </div>
    );
  }

  // Get inputs and outputs from stepConfig if available
  const introConfig = stepConfig?.config as IntroStepConfig | undefined;
  const inputs = introConfig?.inputs || selectedWizard.fields.map((f) => f.label);
  const outputs = introConfig?.outputs || selectedWizard.resultActions.map((a) => a.label);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>{stepConfig?.title || selectedWizard.name}</h2>
      </div>

      <div className={styles.section}>
        <p className={styles.description}>{selectedWizard.description}</p>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Required Inputs</h3>
        <ul className={styles.list}>
          {inputs.map((input, index) => (
            <li key={index} className={styles.listItem}>
              {input}
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Expected Outputs</h3>
        <ul className={styles.list}>
          {outputs.map((output, index) => (
            <li key={index} className={styles.listItem}>
              {output}
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.buttonRow}>
        <button type="button" onClick={goBack} className={styles.button}>
          Back
        </button>
        <button type="button" onClick={goForward} className={`${styles.button} ${styles.buttonPrimary}`}>
          Start Wizard
        </button>
      </div>
    </div>
  );
}
