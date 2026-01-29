import React, { createContext, useContext, useState, useCallback } from "react";
import type { WizardState, WizardDefinition } from "../types/wizard";

interface WizardContextValue extends WizardState {
  // State mutation actions
  setCurrentStep: (step: 1 | 2 | 3 | 4) => void;
  selectWizard: (id: string) => void;
  updateFormData: (data: Record<string, any>) => void;
  resetWizard: () => void;
  goBack: () => void;
  goForward: () => void;
  setWizardDefinitions: (definitions: WizardDefinition[]) => void;
}

const WizardContext = createContext<WizardContextValue | undefined>(undefined);

const getInitialState = (): WizardState => ({
  currentStep: 1,
  selectedWizardId: null,
  formData: {},
  wizardDefinitions: [],
  navigationHistory: [],
});

export function WizardProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WizardState>(getInitialState);

  const setCurrentStep = useCallback((step: 1 | 2 | 3 | 4) => {
    setState((prev) => ({
      ...prev,
      currentStep: step,
      navigationHistory: [...prev.navigationHistory, prev.currentStep],
    }));
  }, []);

  const selectWizard = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      selectedWizardId: id,
      currentStep: 2,
      formData: {}, // Clear form data when selecting new wizard
      navigationHistory: [...prev.navigationHistory, prev.currentStep],
    }));
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
    setState((prev) => ({
      ...getInitialState(),
      wizardDefinitions: prev.wizardDefinitions,
      navigationHistory: [],
    }));
  }, []);

  const goBack = useCallback(() => {
    setState((prev) => {
      const newStep = Math.max(1, prev.currentStep - 1) as 1 | 2 | 3 | 4;
      return {
        ...prev,
        currentStep: newStep,
        navigationHistory: [...prev.navigationHistory, prev.currentStep],
      };
    });
  }, []);

  const goForward = useCallback(() => {
    setState((prev) => {
      const newStep = Math.min(4, prev.currentStep + 1) as 1 | 2 | 3 | 4;
      return {
        ...prev,
        currentStep: newStep,
        navigationHistory: [...prev.navigationHistory, prev.currentStep],
      };
    });
  }, []);

  const setWizardDefinitions = useCallback((definitions: WizardDefinition[]) => {
    setState((prev) => ({
      ...prev,
      wizardDefinitions: definitions,
    }));
  }, []);

  const value: WizardContextValue = {
    ...state,
    setCurrentStep,
    selectWizard,
    updateFormData,
    resetWizard,
    goBack,
    goForward,
    setWizardDefinitions,
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
