import { useWizardContext } from "../context/WizardContext";
import styles from "./Step2Introduction.module.css";

export function Step2Introduction() {
  const { selectedWizard, goBack, goForward } = useWizardContext();

  if (!selectedWizard) {
    return (
      <div className={styles.container}>
        <div className={styles.section}>
          <p>Error: No wizard selected. Please return to step 1.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>{selectedWizard.name}</h2>
      </div>

      <div className={styles.section}>
        <p className={styles.description}>{selectedWizard.description}</p>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Required Inputs</h3>
        <ul className={styles.list}>
          {selectedWizard.fields.map((field) => (
            <li key={field.id} className={styles.listItem}>
              {field.label}
              {field.required && <span className={styles.required}> *</span>}
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Expected Outputs</h3>
        <ul className={styles.list}>
          {selectedWizard.resultActions.map((action) => (
            <li key={action.id} className={styles.listItem}>
              {action.label}
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
