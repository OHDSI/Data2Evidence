import React, { createContext, useContext, useState, useCallback } from "react";
import type { WizardState } from "../types/wizard";
import type { PortalProps } from "../types/portal";
import { getWizardById } from "../config/wizardDefinitions";

interface WizardContextValue extends WizardState {
  // State mutation actions
  setCurrentStep: (step: 1 | 2 | 3 | 4) => void;
  selectWizard: (id: string) => Promise<void>;
  updateFormData: (data: Record<string, any>) => void;
  resetWizard: () => void;
  goBack: () => void;
  goForward: () => void;
  // Portal props from parent
  portalProps: PortalProps;
}

const WizardContext = createContext<WizardContextValue | undefined>(undefined);

const getInitialState = (): WizardState => ({
  currentStep: 1,
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

  const setCurrentStep = useCallback((step: 1 | 2 | 3 | 4) => {
    setState((prev) => ({
      ...prev,
      currentStep: step,
    }));
  }, []);

  const selectWizard = useCallback(async (id: string) => {
    try {
      const wizard = await getWizardById(id);
      setState((prev) => ({
        ...prev,
        selectedWizardId: id,
        selectedWizard: wizard || null,
        currentStep: 2,
        formData: {}, // Clear form data when selecting new wizard
      }));
    } catch (err) {
      console.error("[Wizards] Failed to select wizard:", err);
      throw err;
    }
  }, []);

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

  const goBack = useCallback(() => {
    setState((prev) => {
      const newStep = Math.max(1, prev.currentStep - 1) as 1 | 2 | 3 | 4;
      return {
        ...prev,
        currentStep: newStep,
      };
    });
  }, []);

  const goForward = useCallback(() => {
    setState((prev) => {
      const newStep = Math.min(4, prev.currentStep + 1) as 1 | 2 | 3 | 4;
      return {
        ...prev,
        currentStep: newStep,
      };
    });
  }, []);

  const value: WizardContextValue = {
    ...state,
    setCurrentStep,
    selectWizard,
    updateFormData,
    resetWizard,
    goBack,
    goForward,
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
