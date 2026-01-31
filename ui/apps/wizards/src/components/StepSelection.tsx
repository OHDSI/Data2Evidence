import { useState, useEffect } from "react";
import { getWizardDefinitions } from "../config/wizardDefinitions";
import { useWizardContext } from "../context/WizardContext";
import type { WizardDefinition } from "../types/wizard";
import styles from "./Step1Selection.module.css";

export function Step1Selection() {
  const { selectWizard } = useWizardContext();
  const [wizards, setWizards] = useState<WizardDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWizards = async () => {
    try {
      setLoading(true);
      setError(null);
      const definitions = await getWizardDefinitions();
      setWizards(definitions);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load wizards";
      console.error("[Wizards] Failed to load wizard definitions:", err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWizards();
  }, []);

  const handleWizardSelect = async (wizardId: string) => {
    try {
      await selectWizard(wizardId);
    } catch {
      setError("Failed to load wizard. Please try again.");
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent, wizardId: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleWizardSelect(wizardId);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>Select a Wizard</h2>
        </div>
        <div className={styles.loading} role="status">
          Loading wizards...
        </div>
      </div>
    );
  }

  const handleRetry = () => {
    loadWizards();
  };

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>Select a Wizard</h2>
        </div>
        <div className={styles.error} role="alert">
          Error: {error}
        </div>
        <div style={{ marginTop: "1rem", textAlign: "center" }}>
          <button onClick={handleRetry} className={styles.retryButton}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (wizards.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>Select a Wizard</h2>
        </div>
        <div className={styles.empty}>No wizards available</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Select a Wizard</h2>
      </div>
      <div className={styles.grid}>
        {wizards.map((wizard) => (
          <div
            key={wizard.id}
            className={styles.card}
            onClick={() => handleWizardSelect(wizard.id)}
            onKeyDown={(e) => handleKeyDown(e, wizard.id)}
            role="button"
            tabIndex={0}
            aria-label={`Select ${wizard.name} wizard`}
          >
            <h3 className={styles.cardTitle}>{wizard.name}</h3>
            <p className={styles.cardDescription}>{wizard.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
