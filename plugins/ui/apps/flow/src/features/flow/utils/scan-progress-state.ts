/**
 * Pure classification of Prefect flow-run state names for the Scan Data
 * progress dialog. Kept dependency-free so it is unit-testable without a
 * Redux store or a rendered component.
 */

export const FLOW_STATE_PROGRESS: Record<string, number> = {
  Scheduled: 10,
  Late: 10,
  Pending: 25,
  AwaitingRetry: 25,
  Running: 50,
  Retrying: 50,
  Paused: 50,
  Cancelling: 75,
  Completed: 100,
  Failed: 100,
  Crashed: 100,
  Cancelled: 100,
  TimedOut: 100,
};

const TERMINAL_SUCCESS = "Completed";

/**
 * Prefect terminal failure states. The dialog previously handled only Failed
 * and Crashed, so Cancelled and TimedOut runs left it polling forever.
 */
const TERMINAL_FAILURE = new Set(["Failed", "Crashed", "Cancelled", "TimedOut"]);

/** Consecutive poll failures tolerated before the dialog gives up and reports. */
export const MAX_CONSECUTIVE_POLL_ERRORS = 3;

export interface ScanStateClassification {
  terminal: boolean;
  failed: boolean;
  progress: number | undefined;
}

export function classifyFlowState(stateName: string): ScanStateClassification {
  const progress = FLOW_STATE_PROGRESS[stateName];

  if (stateName === TERMINAL_SUCCESS) {
    return { terminal: true, failed: false, progress };
  }
  if (TERMINAL_FAILURE.has(stateName)) {
    return { terminal: true, failed: true, progress };
  }
  return { terminal: false, failed: false, progress };
}
