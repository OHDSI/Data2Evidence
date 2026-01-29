import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { WizardProvider, useWizardContext } from "../WizardContext";
import React from "react";

describe("WizardContext", () => {
  describe("useWizardContext hook", () => {
    it("should throw error when used outside provider", () => {
      expect(() => {
        renderHook(() => useWizardContext());
      }).toThrow("useWizardContext must be used within WizardProvider");
    });

    it("should return initial state", () => {
      const { result } = renderHook(() => useWizardContext(), {
        wrapper: ({ children }) => <WizardProvider>{children}</WizardProvider>,
      });

      expect(result.current.currentStep).toBe(1);
      expect(result.current.selectedWizardId).toBe(null);
      expect(result.current.selectedWizard).toBe(null);
      expect(result.current.formData).toEqual({});
    });
  });

  describe("selectWizard", () => {
    it("should update selectedWizardId, selectedWizard and set step to 2", async () => {
      const { result } = renderHook(() => useWizardContext(), {
        wrapper: ({ children }) => <WizardProvider>{children}</WizardProvider>,
      });

      await act(async () => {
        await result.current.selectWizard("patient-count");
      });

      expect(result.current.selectedWizardId).toBe("patient-count");
      expect(result.current.selectedWizard).toBeDefined();
      expect(result.current.selectedWizard?.id).toBe("patient-count");
      expect(result.current.currentStep).toBe(2);
    });

    it("should clear form data when selecting a new wizard", async () => {
      const { result } = renderHook(() => useWizardContext(), {
        wrapper: ({ children }) => <WizardProvider>{children}</WizardProvider>,
      });

      act(() => {
        result.current.updateFormData({ field1: "value1" });
      });

      expect(result.current.formData).toEqual({ field1: "value1" });

      await act(async () => {
        await result.current.selectWizard("patient-count");
      });

      expect(result.current.formData).toEqual({});
    });

    it("should set selectedWizard to null for nonexistent wizard", async () => {
      const { result } = renderHook(() => useWizardContext(), {
        wrapper: ({ children }) => <WizardProvider>{children}</WizardProvider>,
      });

      await act(async () => {
        await result.current.selectWizard("nonexistent");
      });

      expect(result.current.selectedWizardId).toBe("nonexistent");
      expect(result.current.selectedWizard).toBe(null);
      expect(result.current.currentStep).toBe(2);
    });
  });

  describe("goForward", () => {
    it("should increment step from 1 to 2", () => {
      const { result } = renderHook(() => useWizardContext(), {
        wrapper: ({ children }) => <WizardProvider>{children}</WizardProvider>,
      });

      expect(result.current.currentStep).toBe(1);

      act(() => {
        result.current.goForward();
      });

      expect(result.current.currentStep).toBe(2);
    });

    it("should increment step from 2 to 3", () => {
      const { result } = renderHook(() => useWizardContext(), {
        wrapper: ({ children }) => <WizardProvider>{children}</WizardProvider>,
      });

      act(() => {
        result.current.setCurrentStep(2);
      });

      expect(result.current.currentStep).toBe(2);

      act(() => {
        result.current.goForward();
      });

      expect(result.current.currentStep).toBe(3);
    });

    it("should be capped at step 4", () => {
      const { result } = renderHook(() => useWizardContext(), {
        wrapper: ({ children }) => <WizardProvider>{children}</WizardProvider>,
      });

      act(() => {
        result.current.setCurrentStep(4);
      });

      expect(result.current.currentStep).toBe(4);

      act(() => {
        result.current.goForward();
      });

      expect(result.current.currentStep).toBe(4);
    });
  });

  describe("goBack", () => {
    it("should decrement step from 2 to 1", () => {
      const { result } = renderHook(() => useWizardContext(), {
        wrapper: ({ children }) => <WizardProvider>{children}</WizardProvider>,
      });

      act(() => {
        result.current.setCurrentStep(2);
      });

      expect(result.current.currentStep).toBe(2);

      act(() => {
        result.current.goBack();
      });

      expect(result.current.currentStep).toBe(1);
    });

    it("should decrement step from 3 to 2", () => {
      const { result } = renderHook(() => useWizardContext(), {
        wrapper: ({ children }) => <WizardProvider>{children}</WizardProvider>,
      });

      act(() => {
        result.current.setCurrentStep(3);
      });

      expect(result.current.currentStep).toBe(3);

      act(() => {
        result.current.goBack();
      });

      expect(result.current.currentStep).toBe(2);
    });

    it("should be capped at step 1", () => {
      const { result } = renderHook(() => useWizardContext(), {
        wrapper: ({ children }) => <WizardProvider>{children}</WizardProvider>,
      });

      expect(result.current.currentStep).toBe(1);

      act(() => {
        result.current.goBack();
      });

      expect(result.current.currentStep).toBe(1);
    });
  });

  describe("updateFormData", () => {
    it("should merge new data with existing form data", () => {
      const { result } = renderHook(() => useWizardContext(), {
        wrapper: ({ children }) => <WizardProvider>{children}</WizardProvider>,
      });

      act(() => {
        result.current.updateFormData({ field1: "value1" });
      });

      expect(result.current.formData).toEqual({ field1: "value1" });

      act(() => {
        result.current.updateFormData({ field2: "value2" });
      });

      expect(result.current.formData).toEqual({
        field1: "value1",
        field2: "value2",
      });
    });

    it("should overwrite existing fields when updating", () => {
      const { result } = renderHook(() => useWizardContext(), {
        wrapper: ({ children }) => <WizardProvider>{children}</WizardProvider>,
      });

      act(() => {
        result.current.updateFormData({ field1: "value1" });
      });

      expect(result.current.formData).toEqual({ field1: "value1" });

      act(() => {
        result.current.updateFormData({ field1: "newValue" });
      });

      expect(result.current.formData).toEqual({ field1: "newValue" });
    });

    it("should handle multiple fields in one update", () => {
      const { result } = renderHook(() => useWizardContext(), {
        wrapper: ({ children }) => <WizardProvider>{children}</WizardProvider>,
      });

      act(() => {
        result.current.updateFormData({
          field1: "value1",
          field2: "value2",
          field3: "value3",
        });
      });

      expect(result.current.formData).toEqual({
        field1: "value1",
        field2: "value2",
        field3: "value3",
      });
    });
  });

  describe("setCurrentStep", () => {
    it("should set the step directly to 3", () => {
      const { result } = renderHook(() => useWizardContext(), {
        wrapper: ({ children }) => <WizardProvider>{children}</WizardProvider>,
      });

      expect(result.current.currentStep).toBe(1);

      act(() => {
        result.current.setCurrentStep(3);
      });

      expect(result.current.currentStep).toBe(3);
    });

    it("should set the step directly to 4", () => {
      const { result } = renderHook(() => useWizardContext(), {
        wrapper: ({ children }) => <WizardProvider>{children}</WizardProvider>,
      });

      act(() => {
        result.current.setCurrentStep(4);
      });

      expect(result.current.currentStep).toBe(4);
    });
  });

  describe("resetWizard", () => {
    it("should return to initial state", async () => {
      const { result } = renderHook(() => useWizardContext(), {
        wrapper: ({ children }) => <WizardProvider>{children}</WizardProvider>,
      });

      await act(async () => {
        await result.current.selectWizard("patient-count");
      });

      act(() => {
        result.current.updateFormData({ field1: "value1" });
        result.current.setCurrentStep(3);
      });

      expect(result.current.currentStep).toBe(3);
      expect(result.current.selectedWizardId).toBe("patient-count");
      expect(result.current.formData).toEqual({ field1: "value1" });

      act(() => {
        result.current.resetWizard();
      });

      expect(result.current.currentStep).toBe(1);
      expect(result.current.selectedWizardId).toBe(null);
      expect(result.current.selectedWizard).toBe(null);
      expect(result.current.formData).toEqual({});
    });
  });

  describe("portalProps", () => {
    it("should provide empty object as default portalProps", () => {
      const { result } = renderHook(() => useWizardContext(), {
        wrapper: ({ children }) => <WizardProvider>{children}</WizardProvider>,
      });

      expect(result.current.portalProps).toEqual({});
    });

    it("should provide custom portalProps when passed", () => {
      const customProps = { datasetId: "test-123", config: { foo: "bar" } };

      const { result } = renderHook(() => useWizardContext(), {
        wrapper: ({ children }) => <WizardProvider portalProps={customProps}>{children}</WizardProvider>,
      });

      expect(result.current.portalProps).toEqual(customProps);
    });
  });
});
