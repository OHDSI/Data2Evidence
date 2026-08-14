import { useEffect } from "react";
import { store } from "~/store";
import { dataflowApiSlice } from "../slices";
import { ComparableNode, isEtlDirty } from "../utils";

const APP_NAME = "flow";

/**
 * Reads dirty state straight from the store so the registry contract's
 * "synchronous and cheap" requirement is met — the portal calls this during
 * navigation.
 */
function hasUnsavedChanges(): boolean {
  const state = store.getState();
  const dataflowId = state.flow.dataflowId;
  if (!dataflowId) return false;

  const liveNodes = Object.values(
    state.flow.nodes.entities
  ) as ComparableNode[];

  const savedRevision = dataflowApiSlice.endpoints.getLatestDataflowById.select(
    dataflowId
  )(state as never);

  return isEtlDirty(liveNodes, savedRevision.data?.flow?.nodes);
}

function handleBeforeUnload(event: BeforeUnloadEvent): void {
  if (!hasUnsavedChanges()) return;
  event.preventDefault();
  event.returnValue = "";
}

/**
 * Registers the flow app with the portal's shared unsaved-changes guard so the
 * user is prompted to save before refresh, tab close, or cross-plugin
 * navigation (OHDSI/Data2Evidence#1162).
 *
 * See plugins/ui/docs/cross-app-unsaved-changes.md for the contract.
 */
export function useFlowUnsavedChanges() {
  useEffect(() => {
    window.__d2eUnsavedChangesRegistry?.register(APP_NAME, {
      hasUnsavedChanges,
      // Intentionally a no-op. Dirty state is derived by comparing against the
      // saved revision, so there is no flag to reset — and the user has just
      // chosen to discard their changes.
      clearUnsavedChanges: () => {},
    });
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      // Mandatory: single-spa keeps module state alive, so a stale
      // registration would make the portal think this app is still dirty.
      window.__d2eUnsavedChangesRegistry?.unregister(APP_NAME);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);
}
