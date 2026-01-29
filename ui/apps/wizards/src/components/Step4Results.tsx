import { useWizardContext } from "../context/WizardContext";
import styles from "./Step4Results.module.css";

export function Step4Results() {
  const { selectedWizard, formData, goBack } = useWizardContext();

  if (!selectedWizard) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>Error</h2>
        </div>
        <p>Error: No wizard selected. Please return to step 1.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Wizard Complete!</h2>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Configuration Summary</h3>
        <div className={styles.summaryList}>
          {Object.entries(formData).map(([fieldId, value]) => {
            const field = selectedWizard.fields.find((f) => f.id === fieldId);
            const fieldLabel = field ? field.label : fieldId;
            return (
              <div key={fieldId} className={styles.summaryItem}>
                <span className={styles.summaryLabel}>{fieldLabel}:</span>
                <span className={styles.summaryValue}>{String(value)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Available Actions</h3>
        <div className={styles.actionButtons}>
          {selectedWizard.resultActions.map((action) => {
            const isPlaceholder = action.type === "placeholder";
            return (
              <button
                key={action.id}
                type="button"
                disabled={isPlaceholder}
                onClick={() => {
                  if (!isPlaceholder) {
                    console.log(`[Wizards] Action: ${action.label} (Coming soon)`);
                  }
                }}
                className={`${styles.button} ${styles.actionButton}`}
                title={isPlaceholder ? "Coming soon" : undefined}
              >
                {action.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.buttonRow}>
        <button type="button" onClick={goBack} className={styles.button}>
          Back
        </button>
      </div>
    </div>
  );
}
