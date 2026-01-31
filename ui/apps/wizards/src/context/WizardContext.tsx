import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { WizardState, WizardStepConfig } from "../types/wizard";
import type { PortalProps } from "../types/portal";
import { getWizardById } from "../config/wizardDefinitions";
import { setTokenGetter } from "../axios/request";

/**
 * Context value for wizard state and navigation.
 *
 * currentStepIndex semantics:
 * - -1 = wizard selection page (no wizard selected)
 * - 0+ = index within the selected wizard's steps array
 */
interface WizardContextValue extends WizardState {
  // State mutation actions
  setCurrentStepIndex: (index: number) => void;
  selectWizard: (id: string) => Promise<void>;
  updateFormData: (data: Record<string, any>) => void;
  resetWizard: () => void;
  goBack: () => void;
  goForward: () => void;
  // Helper functions
  getCurrentStepConfig: () => WizardStepConfig | null;
  // Portal props from parent
  portalProps: PortalProps;
}

const WizardContext = createContext<WizardContextValue | undefined>(undefined);

const getInitialState = (): WizardState => ({
  currentStepIndex: -1,
  selectedWizardId: null,
  selectedWizard: null,
  formData: {},
});

export function WizardProvider({
  children,
  portalProps = {},
}: {
  children: React.ReactNode;
  portalProps?: PortalProps;
}) {
  const [state, setState] = useState<WizardState>(getInitialState);

  useEffect(() => {
    if (portalProps.getToken) {
      setTokenGetter(portalProps.getToken);
    }
  }, [portalProps.getToken]);

  /**
   * Directly set the current step index.
   * @param index - Step index (-1 = selection page, 0+ = wizard step index)
   */
  const setCurrentStepIndex = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      currentStepIndex: index,
    }));
  }, []);

  /**
   * Select a wizard by ID and reset to step 0.
   * Clears previous form data and sets currentStepIndex to 0 (first wizard step).
   * @param id - Wizard identifier
   * @throws Error if wizard loading fails
   */
  const selectWizard = useCallback(
    async (id: string) => {
      try {
        const wizard = await getWizardById(id, portalProps.datasetId);
        setState((prev) => ({
          ...prev,
          selectedWizardId: id,
          selectedWizard: wizard || null,
          currentStepIndex: 0,
          formData: {}, // Clear form data when selecting new wizard
        }));
      } catch (err) {
        console.error("[Wizards] Failed to select wizard:", err);
        throw err;
      }
    },
    [portalProps.datasetId],
  );

  const updateFormData = useCallback((data: Record<string, any>) => {
    setState((prev) => ({
      ...prev,
      formData: {
        ...prev.formData,
        ...data,
      },
    }));
  }, []);

  const resetWizard = useCallback(() => {
    setState(getInitialState());
  }, []);

  /**
   * Navigate to the previous step.
   * - From index 0 -> goes to -1 (selection page) and clears wizard selection
   * - From index 1+ -> decrements currentStepIndex
   * - From index -1 -> stays at -1
   * Note: formData is preserved intentionally to allow users to return
   * to the wizard and resume with their previous inputs.
   */
  const goBack = useCallback(() => {
    setState((prev) => {
      const newIndex = prev.currentStepIndex - 1;
      // Don't go below -1
      if (newIndex < -1) {
        return prev;
      }
      // If going back to -1 (selection page), clear wizard selection
      if (newIndex === -1) {
        return {
          ...prev,
          currentStepIndex: -1,
          selectedWizardId: null,
          selectedWizard: null,
          // formData preserved intentionally for resume functionality
        };
      }
      return {
        ...prev,
        currentStepIndex: newIndex,
      };
    });
  }, []);

  /**
   * Navigate to the next step.
   * - From -1 (selection page) -> advances to step 0
   * - From 0+ -> increments currentStepIndex (if not at last step)
   * - Stays at current step if at the end or no wizard selected
   */
  const goForward = useCallback(() => {
    setState((prev) => {
      // If we're at -1 (selection page), we can always increment to 0
      if (prev.currentStepIndex === -1) {
        return {
          ...prev,
          currentStepIndex: 0,
        };
      }
      // If no wizard selected or no steps, don't increment
      if (!prev.selectedWizard || prev.selectedWizard.steps.length === 0) {
        return prev;
      }
      // Don't increment beyond the wizard's steps
      const maxIndex = prev.selectedWizard.steps.length - 1;
      if (prev.currentStepIndex >= maxIndex) {
        return prev;
      }
      return {
        ...prev,
        currentStepIndex: prev.currentStepIndex + 1,
      };
    });
  }, []);

  /**
   * Get the current step configuration based on currentStepIndex.
   * Returns null in the following cases:
   * - currentStepIndex is -1 (selection page)
   * - No wizard is selected
   * - currentStepIndex is out of bounds
   * @returns The current step config or null
   */
  const getCurrentStepConfig = useCallback((): WizardStepConfig | null => {
    // Selection page - no step config
    if (state.currentStepIndex === -1) {
      return null;
    }
    // No wizard selected
    if (!state.selectedWizard) {
      return null;
    }
    // Index out of bounds
    if (state.currentStepIndex < 0 || state.currentStepIndex >= state.selectedWizard.steps.length) {
      return null;
    }
    // Return the step config at the current index
    return state.selectedWizard.steps[state.currentStepIndex];
  }, [state.currentStepIndex, state.selectedWizard]);

  const value: WizardContextValue = {
    ...state,
    setCurrentStepIndex,
    selectWizard,
    updateFormData,
    resetWizard,
    goBack,
    goForward,
    getCurrentStepConfig,
    portalProps,
  };

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
}

/**
 * Custom hook to access wizard context
 * @throws Error if used outside of WizardProvider
 */
export function useWizardContext(): WizardContextValue {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error("useWizardContext must be used within WizardProvider");
  }
  return context;
}
