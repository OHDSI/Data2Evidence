import type { WizardDashboardState } from "../services/wizardDashboardState";
import styles from "./WizardDashboardModal.module.css";

const stageMessages = {
  "awaiting-cache": "Checking your previous Wizard analyses…",
  "saving-bookmark": "Saving this Wizard analysis…",
  materializing: "Creating the cohort…",
  "resolving-cohort": "Waiting for the cohort to become available…",
  "opening-dashboard": "Opening the dashboard…",
} as const;

interface WizardDashboardModalProps {
  state: WizardDashboardState;
  onClose: () => void;
  onRetry: () => void;
}

export function WizardDashboardModal({ state, onClose, onRetry }: WizardDashboardModalProps) {
  if (!state.isOpen) return null;

  const isWorking = state.status !== "error" && state.status !== "ready";
  return (
    <div className={styles.backdrop} role="presentation">
      <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="wizard-dashboard-title">
        <div className={styles.header}>
          <h2 id="wizard-dashboard-title">Wizard dashboard</h2>
          <button type="button" onClick={onClose} className={styles.closeButton} aria-label="Close dashboard">
            ×
          </button>
        </div>
        <div className={styles.content} aria-live="polite">
          {isWorking && (
            <div className={styles.status}>
              <span className={styles.spinner} aria-hidden="true" />
              <p>{stageMessages[state.status as keyof typeof stageMessages] ?? "Preparing the dashboard…"}</p>
            </div>
          )}
          {state.status === "error" && (
            <div className={styles.status}>
              <p className={styles.error}>{state.error}</p>
              <button type="button" onClick={onRetry} className={styles.actionButton}>
                Try again
              </button>
            </div>
          )}
          {state.status === "ready" && (
            <div className={styles.status}>
              <p>Cohort {state.result?.cohortId} is ready. The dashboard viewer will appear here.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
