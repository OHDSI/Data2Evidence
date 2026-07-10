export type WizardDashboardStatus =
  | "idle"
  | "awaiting-cache"
  | "saving-bookmark"
  | "materializing"
  | "resolving-cohort"
  | "opening-dashboard"
  | "ready"
  | "error";

export interface WizardDashboardResult {
  bookmarkId: string;
  bookmarkName: string;
  cohortId: number;
  wizardConfig: Record<string, unknown>;
}

export interface WizardDashboardState {
  isOpen: boolean;
  status: WizardDashboardStatus;
  operationId: number;
  datasetId: string | null;
  pendingBookmarkName: string | null;
  result: WizardDashboardResult | null;
  error: string | null;
}

export type WizardDashboardEvent =
  | { type: "start"; operationId: number; datasetId: string; pendingBookmarkName?: string | null }
  | { type: "stage"; operationId: number; status: Exclude<WizardDashboardStatus, "idle" | "ready" | "error"> }
  | { type: "bookmark-name"; operationId: number; bookmarkName: string }
  | { type: "ready"; operationId: number; result: WizardDashboardResult }
  | { type: "fail"; operationId: number; message: string }
  | { type: "close" }
  | { type: "dataset-changed"; datasetId?: string };

export const initialWizardDashboardState: WizardDashboardState = {
  isOpen: false,
  status: "idle",
  operationId: 0,
  datasetId: null,
  pendingBookmarkName: null,
  result: null,
  error: null,
};

export function wizardDashboardReducer(state: WizardDashboardState, event: WizardDashboardEvent): WizardDashboardState {
  if ("operationId" in event && event.operationId !== state.operationId && event.type !== "start") {
    return state;
  }

  switch (event.type) {
    case "start":
      return {
        isOpen: true,
        status: "awaiting-cache",
        operationId: event.operationId,
        datasetId: event.datasetId,
        pendingBookmarkName: event.pendingBookmarkName ?? null,
        result: null,
        error: null,
      };
    case "stage":
      return { ...state, status: event.status, error: null };
    case "bookmark-name":
      return { ...state, pendingBookmarkName: event.bookmarkName };
    case "ready":
      return {
        ...state,
        status: "ready",
        pendingBookmarkName: event.result.bookmarkName,
        result: event.result,
        error: null,
      };
    case "fail":
      return { ...state, status: "error", error: event.message, result: null };
    case "close":
      return { ...state, isOpen: false };
    case "dataset-changed":
      if (event.datasetId === state.datasetId) return state;
      return { ...initialWizardDashboardState, operationId: state.operationId + 1 };
  }
}
