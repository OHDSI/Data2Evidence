import { useCallback, useEffect, useReducer, useRef } from "react";
import type { ConfigMeta } from "../config/cdwConfig";
import type { MriBookmark } from "../utils/mriQuery";
import { runWizardDashboardFlow, type RunWizardDashboardFlowInput } from "../services/wizardDashboardFlow";
import {
  initialWizardDashboardState,
  wizardDashboardReducer,
  type WizardDashboardState,
} from "../services/wizardDashboardState";

interface UseWizardDashboardFlowOptions {
  datasetId?: string;
  username?: string;
  ensureCache: () => Promise<unknown>;
  refreshCache: () => Promise<unknown>;
}

export interface OpenWizardDashboardInput {
  bookmark: MriBookmark;
  wizardConfig: Record<string, unknown>;
  configMeta: ConfigMeta;
}

type ActiveStage = Exclude<WizardDashboardState["status"], "idle" | "ready" | "error">;

const stageErrorMessages: Record<ActiveStage, string> = {
  "awaiting-cache": "We couldn't check your previous Wizard analyses. Please try again.",
  "saving-bookmark": "We couldn't save this Wizard analysis. Please try again.",
  materializing: "We couldn't generate the cohort. Please try again.",
  "resolving-cohort": "The cohort is taking longer than expected. Please try again.",
  "opening-dashboard": "We couldn't open the dashboard. Please try again.",
};

function safeFlowError(error: unknown, stage: ActiveStage): string {
  if (error instanceof DOMException && error.name === "AbortError") return "The dashboard request was cancelled.";
  return stageErrorMessages[stage];
}

export function useWizardDashboardFlow({
  datasetId,
  username,
  ensureCache,
  refreshCache,
}: UseWizardDashboardFlowOptions): {
  state: WizardDashboardState;
  openDashboard: (loadInput: () => Promise<OpenWizardDashboardInput>) => void;
  retry: () => void;
  close: () => void;
} {
  const [state, dispatch] = useReducer(wizardDashboardReducer, initialWizardDashboardState);
  const operationIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const lastInputRef = useRef<RunWizardDashboardFlowInput | null>(null);
  const pendingBookmarkNameRef = useRef<string | null>(null);
  const materializationSubmittedRef = useRef<string | null>(null);
  const activeStageRef = useRef<ActiveStage>("awaiting-cache");
  const loadInputRef = useRef<(() => Promise<OpenWizardDashboardInput>) | null>(null);

  const execute = useCallback(
    (input: RunWizardDashboardFlowInput) => {
      const operationId = ++operationIdRef.current;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const flowInput = { ...input, signal: controller.signal };
      lastInputRef.current = flowInput;
      activeStageRef.current = "awaiting-cache";
      dispatch({
        type: "start",
        operationId,
        datasetId: input.datasetId,
        pendingBookmarkName: input.pendingBookmarkName,
      });

      void runWizardDashboardFlow(flowInput, {
        ensureCache,
        refreshCache,
        onStage: (status) => {
          activeStageRef.current = status;
          dispatch({ type: "stage", operationId, status });
        },
        onBookmarkName: (bookmarkName) => {
          pendingBookmarkNameRef.current = bookmarkName;
          if (lastInputRef.current) lastInputRef.current.pendingBookmarkName = bookmarkName;
          dispatch({ type: "bookmark-name", operationId, bookmarkName });
        },
        onMaterializationSubmitted: (bookmarkId) => {
          materializationSubmittedRef.current = bookmarkId;
          if (lastInputRef.current) lastInputRef.current.materializationSubmittedForBookmarkId = bookmarkId;
        },
      })
        .then((result) => dispatch({ type: "ready", operationId, result }))
        .catch((error: unknown) => {
          if (!controller.signal.aborted) {
            dispatch({
              type: "fail",
              operationId,
              message: safeFlowError(error, activeStageRef.current),
              stage: activeStageRef.current,
            });
          }
        });
    },
    [ensureCache, refreshCache]
  );

  const openDashboard = useCallback(
    (loadInput: () => Promise<OpenWizardDashboardInput>) => {
      loadInputRef.current = loadInput;
      pendingBookmarkNameRef.current = null;
      materializationSubmittedRef.current = null;
      const operationId = ++operationIdRef.current;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      dispatch({ type: "start", operationId, datasetId: datasetId ?? "" });

      void loadInput()
        .then(({ bookmark, wizardConfig, configMeta }) => {
          if (controller.signal.aborted) return;
          if (!datasetId || !username || !configMeta.dependentConfig) {
            dispatch({
              type: "fail",
              operationId,
              message: "The active dataset configuration is incomplete. The Cohort Builder option is still available.",
              stage: "awaiting-cache",
            });
            return;
          }
          execute({
            datasetId,
            username,
            paConfigId: configMeta.configId,
            cdmConfigId: configMeta.dependentConfig.configId,
            cdmConfigVersion: configMeta.dependentConfig.configVersion,
            bookmark,
            wizardConfig,
          });
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            dispatch({
              type: "fail",
              operationId,
              message: "We couldn't prepare this Wizard analysis. Please try again.",
              stage: "opening-dashboard",
            });
          }
        });
    },
    [datasetId, execute, username]
  );

  const retry = useCallback(() => {
    const input = lastInputRef.current;
    if (!input) {
      if (loadInputRef.current) openDashboard(loadInputRef.current);
      return;
    }
    execute({
      ...input,
      pendingBookmarkName: pendingBookmarkNameRef.current ?? input.pendingBookmarkName,
      materializationSubmittedForBookmarkId:
        materializationSubmittedRef.current ?? input.materializationSubmittedForBookmarkId,
    });
  }, [execute, openDashboard]);

  const close = useCallback(() => {
    abortRef.current?.abort();
    dispatch({ type: "close" });
  }, []);

  useEffect(() => {
    abortRef.current?.abort();
    lastInputRef.current = null;
    pendingBookmarkNameRef.current = null;
    materializationSubmittedRef.current = null;
    loadInputRef.current = null;
    dispatch({ type: "dataset-changed", datasetId });
  }, [datasetId]);

  useEffect(() => () => abortRef.current?.abort(), []);

  return { state, openDashboard, retry, close };
}
