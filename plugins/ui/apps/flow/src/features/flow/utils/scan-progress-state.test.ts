import { describe, expect, test } from "vitest";
import {
  classifyFlowState,
  MAX_CONSECUTIVE_POLL_ERRORS,
} from "./scan-progress-state";

describe("classifyFlowState", () => {
  test("Completed is terminal and successful", () => {
    expect(classifyFlowState("Completed")).toEqual({
      terminal: true,
      failed: false,
      progress: 100,
    });
  });

  test.each(["Failed", "Crashed", "Cancelled", "TimedOut"])(
    "%s is terminal and failed",
    (state) => {
      const result = classifyFlowState(state);
      expect(result.terminal).toBe(true);
      expect(result.failed).toBe(true);
    }
  );

  test.each(["Scheduled", "Pending", "Running", "Paused", "Cancelling"])(
    "%s is not terminal",
    (state) => {
      const result = classifyFlowState(state);
      expect(result.terminal).toBe(false);
      expect(result.failed).toBe(false);
    }
  );

  test("known in-progress states carry a progress value", () => {
    expect(classifyFlowState("Pending").progress).toBe(25);
    expect(classifyFlowState("Running").progress).toBe(50);
  });

  test("an unknown state is treated as non-terminal with no progress", () => {
    expect(classifyFlowState("SomeFutureState")).toEqual({
      terminal: false,
      failed: false,
      progress: undefined,
    });
  });

  test("poll error tolerance is a small positive number", () => {
    expect(MAX_CONSECUTIVE_POLL_ERRORS).toBeGreaterThan(0);
    expect(MAX_CONSECUTIVE_POLL_ERRORS).toBeLessThanOrEqual(5);
  });
});
