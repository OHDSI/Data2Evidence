import { useWizardContext } from "../context/WizardContext";
import { generateDeepLink } from "../utils/deepLinks";
import styles from "./StepResults.module.css";

/**
 * Results step renderer with deep links.
 */
export function StepResults() {
  const { selectedWizard, formData, goBack, portalProps, getCurrentStepConfig } = useWizardContext();
  const stepConfig = getCurrentStepConfig();

  if (!selectedWizard) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>Error</h2>
        </div>
        <p>Error: No wizard selected. Please return to wizard selection.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>{stepConfig?.title || "Wizard Complete!"}</h2>
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
            const deepLinkUrl =
              action.type === "deep-link" ? generateDeepLink(action, formData, portalProps.datasetId) : null;

            return (
              <div key={action.id} style={{ marginBottom: "1rem" }}>
                <button
                  type="button"
                  disabled={isPlaceholder}
                  onClick={() => {
                    if (deepLinkUrl) {
                      window.location.href = deepLinkUrl;
                    } else if (!isPlaceholder) {
                      console.log(`[Wizards] Action: ${action.label} (Coming soon)`);
                    }
                  }}
                  className={`${styles.button} ${styles.actionButton}`}
                  title={isPlaceholder ? "Coming soon" : undefined}
                >
                  {action.label}
                </button>
                {deepLinkUrl && (
                  <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#666" }}>
                    <strong>URL:</strong>{" "}
                    <code
                      style={{
                        background: "#f5f5f5",
                        padding: "0.25rem 0.5rem",
                        borderRadius: "4px",
                        wordBreak: "break-all",
                      }}
                    >
                      {deepLinkUrl}
                    </code>
                  </div>
                )}
              </div>
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
