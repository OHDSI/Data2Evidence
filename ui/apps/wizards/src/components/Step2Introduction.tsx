import { useState, useEffect } from "react";
import { getWizardById } from "../config/wizardDefinitions";
import { useWizardContext } from "../context/WizardContext";
import type { WizardDefinition } from "../types/wizard";
import styles from "./Step2Introduction.module.css";

export function Step2Introduction() {
  const { selectedWizardId, goBack, goForward } = useWizardContext();
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

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>Introduction</h2>
          <p className={styles.progress}>Step 2 of 4</p>
        </div>
        <div className={styles.loading}>Loading wizard...</div>
      </div>
    );
  }

  if (error || !wizard) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>Introduction</h2>
          <p className={styles.progress}>Step 2 of 4</p>
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
        <h2>{wizard.name}</h2>
        <p className={styles.progress}>Step 2 of 4</p>
      </div>

      <div className={styles.section}>
        <p className={styles.description}>{wizard.description}</p>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Required Inputs</h3>
        <ul className={styles.list}>
          {wizard.fields.map((field) => (
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
          {wizard.resultActions.map((action) => (
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
