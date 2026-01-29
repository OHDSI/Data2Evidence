import { useState, useEffect } from "react";
import { getWizardById } from "../config/wizardDefinitions";
import { useWizardContext } from "../context/WizardContext";
import type { WizardDefinition } from "../types/wizard";
import styles from "./Step4Results.module.css";

export function Step4Results() {
  const { selectedWizardId, formData, goBack } = useWizardContext();
  const [wizard, setWizard] = useState<WizardDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadWizard() {
      if (!selectedWizardId) {
        setError("No wizard selected");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const definition = await getWizardById(selectedWizardId);
        if (!definition) {
          setError("Wizard not found");
        } else {
          setWizard(definition);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load wizard");
      } finally {
        setLoading(false);
      }
    }

    loadWizard();
  }, [selectedWizardId]);

  const handleActionClick = (actionLabel: string) => {
    alert("Coming soon: " + actionLabel);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>Results</h2>
          <p className={styles.progress}>Step 4 of 4</p>
        </div>
        <div className={styles.loading}>Loading wizard...</div>
      </div>
    );
  }

  if (error || !wizard) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>Results</h2>
          <p className={styles.progress}>Step 4 of 4</p>
        </div>
        <div className={styles.error}>Error: {error || "Wizard not found"}</div>
        <div className={styles.buttonRow}>
          <button type="button" onClick={goBack} className={styles.button}>
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Wizard Complete!</h2>
        <p className={styles.progress}>Step 4 of 4</p>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Configuration Summary</h3>
        <div className={styles.summaryList}>
          {Object.entries(formData).map(([fieldId, value]) => {
            const field = wizard.fields.find((f) => f.id === fieldId);
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
          {wizard.resultActions.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => handleActionClick(action.label)}
              className={`${styles.button} ${styles.actionButton}`}
            >
              {action.label}
            </button>
          ))}
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
