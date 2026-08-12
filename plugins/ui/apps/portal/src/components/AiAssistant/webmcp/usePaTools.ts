import { useCallback, useEffect, useMemo, useState } from "react";
import { useActiveDataset } from "../../../contexts";
import { arePaToolsAvailable, getPaDatasetId, listPaTools, subscribePaTools, PaToolDescriptor } from "./paToolBridge";

export interface PaToolsState {
  /** Patient Analytics is mounted, so its live cohort tools can be called. */
  available: boolean;
  /**
   * PA has a different dataset loaded than the portal's active one. Editing
   * across that gap would silently change a cohort in the wrong dataset, so the
   * tools are withheld until the two agree (they resync a beat after a dataset
   * switch).
   */
  datasetMismatch: boolean;
  /** Descriptors to advertise to the agent — empty unless usable. */
  tools: PaToolDescriptor[];
}

/**
 * Tracks whether the live PA cohort tools are usable right now.
 *
 * Availability is not static: PA mounts only on the cohort builder route, so the
 * assistant gains and loses this tool surface as the user navigates, and the
 * drawer has to say so rather than let the model call tools that aren't there.
 */
export function usePaTools(): PaToolsState {
  const { activeDataset } = useActiveDataset();
  const [available, setAvailable] = useState(false);
  const [paDatasetId, setPaDatasetId] = useState<string | null>(null);

  const sync = useCallback(() => {
    const isAvailable = arePaToolsAvailable();
    setAvailable(isAvailable);
    setPaDatasetId(isAvailable ? getPaDatasetId() : null);
  }, []);

  useEffect(() => subscribePaTools(sync), [sync]);

  // PA can swap datasets without mounting or unmounting, which fires no
  // availability event — re-read when the portal's active dataset changes.
  useEffect(sync, [sync, activeDataset?.id]);

  const datasetMismatch = available && !!paDatasetId && !!activeDataset?.id && paDatasetId !== activeDataset.id;

  const tools = useMemo(
    () => (available && !datasetMismatch ? listPaTools() : []),
    // listPaTools() returns a fresh array; recompute only when usability changes
    // so the agent's tool list stays referentially stable across renders.
    [available, datasetMismatch]
  );

  return { available, datasetMismatch, tools };
}
