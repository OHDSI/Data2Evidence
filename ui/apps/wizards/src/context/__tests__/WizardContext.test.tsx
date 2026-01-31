import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { WizardProvider, useWizardContext } from "../WizardContext";

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

      expect(result.current.currentStepIndex).toBe(-1);
      expect(result.current.selectedWizardId).toBe(null);
      expect(result.current.selectedWizard).toBe(null);
      expect(result.current.formData).toEqual({});
    });
  });

  describe("selectWizard", () => {
    it("should update selectedWizardId, selectedWizard and set currentStepIndex to 0", async () => {
      const { result } = renderHook(() => useWizardContext(), {
        wrapper: ({ children }) => <WizardProvider>{children}</WizardProvider>,
      });

      await act(async () => {
        await result.current.selectWizard("patient-count");
      });

      expect(result.current.selectedWizardId).toBe("patient-count");
      expect(result.current.selectedWizard).toBeDefined();
      expect(result.current.selectedWizard?.id).toBe("patient-count");
      expect(result.current.currentStepIndex).toBe(0);
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
      expect(result.current.currentStepIndex).toBe(0);
    });
  });

  describe("goForward", () => {
    it("should increment index from -1 to 0", () => {
      const { result } = renderHook(() => useWizardContext(), {
        wrapper: ({ children }) => <WizardProvider>{children}</WizardProvider>,
      });

      expect(result.current.currentStepIndex).toBe(-1);

      act(() => {
        result.current.goForward();
      });

      expect(result.current.currentStepIndex).toBe(0);
    });

    it("should not increment beyond wizard steps length", async () => {
      const { result } = renderHook(() => useWizardContext(), {
        wrapper: ({ children }) => <WizardProvider>{children}</WizardProvider>,
      });

      await act(async () => {
        await result.current.selectWizard("patient-count");
      });

      // Set to a high index
      act(() => {
        result.current.setCurrentStepIndex(10);
      });

      const beforeIndex = result.current.currentStepIndex;

      act(() => {
        result.current.goForward();
      });

      // Should not increment when already at or beyond wizard bounds
      expect(result.current.currentStepIndex).toBe(beforeIndex);
    });

    it("should not increment when no wizard is selected", () => {
      const { result } = renderHook(() => useWizardContext(), {
        wrapper: ({ children }) => <WizardProvider>{children}</WizardProvider>,
      });

      act(() => {
        result.current.setCurrentStepIndex(0);
      });

      expect(result.current.currentStepIndex).toBe(0);

      act(() => {
        result.current.goForward();
      });

      // Should not increment when no wizard selected
      expect(result.current.currentStepIndex).toBe(0);
    });
  });

  describe("goBack", () => {
    it("should decrement index from 1 to 0", async () => {
      const { result } = renderHook(() => useWizardContext(), {
        wrapper: ({ children }) => <WizardProvider>{children}</WizardProvider>,
      });

      await act(async () => {
        await result.current.selectWizard("patient-count");
      });

      act(() => {
        result.current.setCurrentStepIndex(1);
      });

      expect(result.current.currentStepIndex).toBe(1);

      act(() => {
        result.current.goBack();
      });

      expect(result.current.currentStepIndex).toBe(0);
    });

    it("should decrement index from 0 to -1 and clear wizard", async () => {
      const { result } = renderHook(() => useWizardContext(), {
        wrapper: ({ children }) => <WizardProvider>{children}</WizardProvider>,
      });

      await act(async () => {
        await result.current.selectWizard("patient-count");
      });

      expect(result.current.currentStepIndex).toBe(0);
      expect(result.current.selectedWizard).toBeDefined();

      act(() => {
        result.current.goBack();
      });

      expect(result.current.currentStepIndex).toBe(-1);
      expect(result.current.selectedWizard).toBe(null);
      expect(result.current.selectedWizardId).toBe(null);
    });

    it("should not decrement below -1", () => {
      const { result } = renderHook(() => useWizardContext(), {
        wrapper: ({ children }) => <WizardProvider>{children}</WizardProvider>,
      });

      expect(result.current.currentStepIndex).toBe(-1);

      act(() => {
        result.current.goBack();
      });

      expect(result.current.currentStepIndex).toBe(-1);
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

  describe("setCurrentStepIndex", () => {
    it("should set the index directly to 0", () => {
      const { result } = renderHook(() => useWizardContext(), {
        wrapper: ({ children }) => <WizardProvider>{children}</WizardProvider>,
      });

      expect(result.current.currentStepIndex).toBe(-1);

      act(() => {
        result.current.setCurrentStepIndex(0);
      });

      expect(result.current.currentStepIndex).toBe(0);
    });

    it("should set the index directly to 2", () => {
      const { result } = renderHook(() => useWizardContext(), {
        wrapper: ({ children }) => <WizardProvider>{children}</WizardProvider>,
      });

      act(() => {
        result.current.setCurrentStepIndex(2);
      });

      expect(result.current.currentStepIndex).toBe(2);
    });

    it("should allow setting index to -1", () => {
      const { result } = renderHook(() => useWizardContext(), {
        wrapper: ({ children }) => <WizardProvider>{children}</WizardProvider>,
      });

      act(() => {
        result.current.setCurrentStepIndex(5);
      });

      expect(result.current.currentStepIndex).toBe(5);

      act(() => {
        result.current.setCurrentStepIndex(-1);
      });

      expect(result.current.currentStepIndex).toBe(-1);
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
        result.current.setCurrentStepIndex(2);
      });

      expect(result.current.currentStepIndex).toBe(2);
      expect(result.current.selectedWizardId).toBe("patient-count");
      expect(result.current.formData).toEqual({ field1: "value1" });

      act(() => {
        result.current.resetWizard();
      });

      expect(result.current.currentStepIndex).toBe(-1);
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

  describe("getCurrentStepConfig", () => {
    it("should return null when currentStepIndex is -1 (selection page)", () => {
      const { result } = renderHook(() => useWizardContext(), {
        wrapper: ({ children }) => <WizardProvider>{children}</WizardProvider>,
      });

      expect(result.current.currentStepIndex).toBe(-1);
      expect(result.current.getCurrentStepConfig()).toBe(null);
    });

    it("should return first step config when currentStepIndex is 0", async () => {
      const { result } = renderHook(() => useWizardContext(), {
        wrapper: ({ children }) => <WizardProvider>{children}</WizardProvider>,
      });

      await act(async () => {
        await result.current.selectWizard("patient-count");
      });

      expect(result.current.currentStepIndex).toBe(0);
      const stepConfig = result.current.getCurrentStepConfig();
      expect(stepConfig).toBeDefined();
      expect(stepConfig?.id).toBe("intro");
      expect(stepConfig?.type).toBe("intro");
    });

    it("should return null when wizard is null", () => {
      const { result } = renderHook(() => useWizardContext(), {
        wrapper: ({ children }) => <WizardProvider>{children}</WizardProvider>,
      });

      act(() => {
        result.current.setCurrentStepIndex(0);
      });

      expect(result.current.selectedWizard).toBe(null);
      expect(result.current.currentStepIndex).toBe(0);
      expect(result.current.getCurrentStepConfig()).toBe(null);
    });

    it("should return null when currentStepIndex is greater than or equal to steps.length", async () => {
      const { result } = renderHook(() => useWizardContext(), {
        wrapper: ({ children }) => <WizardProvider>{children}</WizardProvider>,
      });

      await act(async () => {
        await result.current.selectWizard("patient-count");
      });

      const stepsLength = result.current.selectedWizard?.steps?.length || 0;

      act(() => {
        result.current.setCurrentStepIndex(stepsLength);
      });

      expect(result.current.getCurrentStepConfig()).toBe(null);
    });

    it("should return second step config when currentStepIndex is 1", async () => {
      const { result } = renderHook(() => useWizardContext(), {
        wrapper: ({ children }) => <WizardProvider>{children}</WizardProvider>,
      });

      await act(async () => {
        await result.current.selectWizard("patient-count");
      });

      act(() => {
        result.current.setCurrentStepIndex(1);
      });

      expect(result.current.currentStepIndex).toBe(1);
      const stepConfig = result.current.getCurrentStepConfig();
      expect(stepConfig).toBeDefined();
      expect(stepConfig?.id).toBe("form");
      expect(stepConfig?.type).toBe("form");
    });
  });
});
