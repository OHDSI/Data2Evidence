import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import type { PatientAnalyticsCohortListItem } from "../api/wizardCohortApi";
import {
  WizardBookmarkCacheController,
  type WizardBookmarkCacheSnapshot,
} from "../services/WizardBookmarkCacheController";

export interface WizardBookmarkCacheValue {
  snapshot: WizardBookmarkCacheSnapshot;
  ensureReady: () => Promise<PatientAnalyticsCohortListItem[]>;
  refresh: () => Promise<PatientAnalyticsCohortListItem[]>;
}

export function useWizardBookmarkCache(datasetId?: string): WizardBookmarkCacheValue {
  const controllerRef = useRef<WizardBookmarkCacheController | null>(null);
  if (controllerRef.current === null) {
    controllerRef.current = new WizardBookmarkCacheController();
  }
  const controller = controllerRef.current;

  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);

  useEffect(() => {
    controller.setDataset(datasetId);
  }, [controller, datasetId]);

  useEffect(() => () => controller.dispose(), [controller]);

  const requireDatasetId = useCallback((): string => {
    if (!datasetId) {
      throw new Error("A dataset is required to load Wizard bookmarks");
    }
    return datasetId;
  }, [datasetId]);

  const ensureReady = useCallback(() => controller.ensureReady(requireDatasetId()), [controller, requireDatasetId]);
  const refresh = useCallback(() => controller.refresh(requireDatasetId()), [controller, requireDatasetId]);

  return { snapshot, ensureReady, refresh };
}
