import { useState, useEffect } from "react";
import { getWizardDefinitions } from "../config/wizardDefinitions";
import { useWizardContext } from "../context/WizardContext";
import type { WizardDefinition } from "../types/wizard";
import styles from "./StepSelection.module.css";

/**
 * Wizard selection grid.
 */
export function StepSelection() {
  const { selectWizard, portalProps } = useWizardContext();
  const [wizards, setWizards] = useState<WizardDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWizards = async () => {
    try {
      setLoading(true);
      setError(null);
      const definitions = await getWizardDefinitions(portalProps.datasetId);
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
  }, [portalProps.datasetId]);

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

  const renderContent = () => {
    if (loading) {
      return (
        <div className={styles.grid}>
          <div className={styles.loading} role="status">
            Loading wizards...
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <>
          <div className={styles.error} role="alert">
            Error: {error}
          </div>
          <div style={{ marginTop: "1rem", textAlign: "center" }}>
            <button onClick={loadWizards} className={styles.retryButton}>
              Retry
            </button>
          </div>
        </>
      );
    }

    if (wizards.length === 0) {
      return <div className={styles.empty}>No wizards available</div>;
    }

    return (
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
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Getting started</h2>
        <p className={styles.subtitle}>We've built some pre-configured scenarios to get you started</p>
      </div>
      {renderContent()}
    </div>
  );
}
