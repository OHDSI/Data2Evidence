import { useEffect, useLayoutEffect, useRef } from "react";
import { useWizardContext } from "../context/WizardContext";
import { ErrorBoundary } from "./ErrorBoundary";
import { StepSelection } from "./StepSelection";
import { StepIntro } from "./StepIntro";
import { StepForm } from "./StepForm";
import { StepResults } from "./StepResults";
import type { StepType } from "../types/wizard";
import styles from "./WizardShell.module.css";

/**
 * Step type registry mapping step types to their corresponding components.
 * This enables config-driven routing where wizards define their flow via step configs.
 */
const stepTypeRegistry: Record<StepType, React.ComponentType> = {
  selection: StepSelection,
  intro: StepIntro,
  form: StepForm,
  results: StepResults,
};

/**
 * Main wizard renderer using step type registry.
 */
export function WizardShell() {
  const { currentStepIndex, selectedWizard, getCurrentStepConfig, setCurrentStepIndex, resetWizard, portalProps } =
    useWizardContext();
  const shellRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const shell = shellRef.current;
    if (!shell || portalProps.isAtlas !== true) return;

    // page-card is owned by Atlas and supplies the outer spacing used here.
    const pageCard = shell.closest<HTMLElement>(".page-card");

    const fitShellToViewport = () => {
      // Atlas owns the outer page and card spacing. Fit the Wizard between its
      // mount point and the card's visible bottom so only the Wizard scrolls.
      const pageWrapper = shell.closest<HTMLElement>(".page-wrapper");
      const shellTop = shell.getBoundingClientRect().top;
      const viewportBottom = Math.min(pageWrapper?.getBoundingClientRect().bottom ?? window.innerHeight, window.innerHeight);
      const wrapperBottomPadding = Number.parseFloat(
        pageWrapper ? window.getComputedStyle(pageWrapper).paddingBottom : "0",
      );
      const cardBottomPadding = Number.parseFloat(pageCard ? window.getComputedStyle(pageCard).paddingBottom : "0");
      const availableHeight = Math.max(320, viewportBottom - shellTop - wrapperBottomPadding - cardBottomPadding);
      shell.style.setProperty("--wizard-shell-height", `${availableHeight}px`);
    };

    const pageWrapper = shell.closest<HTMLElement>(".page-wrapper");
    const resizeObserver = pageWrapper ? new ResizeObserver(fitShellToViewport) : undefined;
    resizeObserver?.observe(pageWrapper);
    const animationFrame = window.requestAnimationFrame(fitShellToViewport);
    window.addEventListener("resize", fitShellToViewport);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", fitShellToViewport);
      shell.style.removeProperty("--wizard-shell-height");
    };
  }, [currentStepIndex, portalProps.isAtlas]);

  // Handle invalid state: index > -1 but no wizard selected
  useEffect(() => {
    if (currentStepIndex > -1 && !selectedWizard) {
      console.warn("[Wizards] No wizard selected, redirecting to selection page");
      setCurrentStepIndex(-1);
    }
  }, [currentStepIndex, selectedWizard, setCurrentStepIndex]);

  const renderStep = () => {
    // Selection page (index -1)
    if (currentStepIndex === -1) {
      return <StepSelection />;
    }

    // If index > -1 but no wizard selected, show selection (redirect handled in useEffect)
    if (currentStepIndex > -1 && !selectedWizard) {
      return <StepSelection />;
    }

    // Get the current step configuration from context
    const stepConfig = getCurrentStepConfig();

    // If stepConfig is null or wizard is missing, show error
    if (!stepConfig || !selectedWizard) {
      console.error("[Wizards] Invalid step configuration:", {
        stepConfig,
        selectedWizard: selectedWizard?.id,
        currentStepIndex,
      });
      return (
        <div className={styles.error}>
          <h2>Configuration Error</h2>
          <p>Unable to load step configuration. Please return to the selection page.</p>
          <button onClick={() => setCurrentStepIndex(-1)}>Back to Selection</button>
        </div>
      );
    }

    // Look up the component by step type in the registry
    const StepComponent = stepTypeRegistry[stepConfig.type];

    // Handle unknown step types
    if (!StepComponent) {
      console.error("[Wizards] Unknown step type:", stepConfig.type);
      return (
        <div className={styles.error}>
          <h2>Configuration Error</h2>
          <p>Unknown step type: {stepConfig.type}</p>
          <button onClick={() => setCurrentStepIndex(-1)}>Back to Selection</button>
        </div>
      );
    }

    // Render the component (step components get config from context internally)
    return <StepComponent />;
  };

  return (
    <div
      ref={shellRef}
      className={`${styles.shell} ${portalProps.isAtlas === true ? styles.atlasShell : ""}`}
      data-atlas-wizard-step={portalProps.isAtlas === true && currentStepIndex >= 0 ? "" : undefined}
    >
      <main className={styles.content}>
        <ErrorBoundary onReset={resetWizard}>{renderStep()}</ErrorBoundary>
      </main>
    </div>
  );
}
