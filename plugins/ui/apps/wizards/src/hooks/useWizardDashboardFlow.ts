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

function safeFlowError(error: unknown): string {
  if (error instanceof DOMException && error.name === "AbortError") return "The dashboard request was cancelled.";
  if (error instanceof Error && error.message.startsWith("Unable to ")) return error.message;
  return "The Wizard dashboard could not be prepared. Please try again.";
}

export function useWizardDashboardFlow({
  datasetId,
  username,
  ensureCache,
  refreshCache,
}: UseWizardDashboardFlowOptions): {
  state: WizardDashboardState;
  openDashboard: (input: OpenWizardDashboardInput) => void;
  retry: () => void;
  close: () => void;
} {
  const [state, dispatch] = useReducer(wizardDashboardReducer, initialWizardDashboardState);
  const operationIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const lastInputRef = useRef<RunWizardDashboardFlowInput | null>(null);
  const pendingBookmarkNameRef = useRef<string | null>(null);

  const execute = useCallback(
    (input: RunWizardDashboardFlowInput) => {
      const operationId = ++operationIdRef.current;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const flowInput = { ...input, signal: controller.signal };
      lastInputRef.current = flowInput;
      dispatch({
        type: "start",
        operationId,
        datasetId: input.datasetId,
        pendingBookmarkName: input.pendingBookmarkName,
      });

      void runWizardDashboardFlow(flowInput, {
        ensureCache,
        refreshCache,
        onStage: (status) => dispatch({ type: "stage", operationId, status }),
        onBookmarkName: (bookmarkName) => {
          pendingBookmarkNameRef.current = bookmarkName;
          if (lastInputRef.current) lastInputRef.current.pendingBookmarkName = bookmarkName;
          dispatch({ type: "bookmark-name", operationId, bookmarkName });
        },
      })
        .then((result) => dispatch({ type: "ready", operationId, result }))
        .catch((error: unknown) => {
          if (!controller.signal.aborted) {
            dispatch({ type: "fail", operationId, message: safeFlowError(error) });
          }
        });
    },
    [ensureCache, refreshCache]
  );

  const openDashboard = useCallback(
    ({ bookmark, wizardConfig, configMeta }: OpenWizardDashboardInput) => {
      if (!datasetId || !username || !configMeta.dependentConfig) {
        const operationId = ++operationIdRef.current;
        dispatch({ type: "start", operationId, datasetId: datasetId ?? "" });
        dispatch({
          type: "fail",
          operationId,
          message: "The active dataset configuration is incomplete. The Cohort Builder option is still available.",
        });
        return;
      }
      pendingBookmarkNameRef.current = null;
      execute({
        datasetId,
        username,
        paConfigId: configMeta.configId,
        cdmConfigId: configMeta.dependentConfig.configId,
        cdmConfigVersion: configMeta.dependentConfig.configVersion,
        bookmark,
        wizardConfig,
      });
    },
    [datasetId, execute, username]
  );

  const retry = useCallback(() => {
    const input = lastInputRef.current;
    if (!input) return;
    execute({ ...input, pendingBookmarkName: pendingBookmarkNameRef.current ?? input.pendingBookmarkName });
  }, [execute]);

  const close = useCallback(() => {
    abortRef.current?.abort();
    dispatch({ type: "close" });
  }, []);

  useEffect(() => {
    abortRef.current?.abort();
    lastInputRef.current = null;
    pendingBookmarkNameRef.current = null;
    dispatch({ type: "dataset-changed", datasetId });
  }, [datasetId]);

  useEffect(() => () => abortRef.current?.abort(), []);

  return { state, openDashboard, retry, close };
}
