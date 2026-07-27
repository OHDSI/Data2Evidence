import { useCallback, useRef, useState } from "react";

interface UnsavedChangesRegistryLike {
  hasAnyUnsavedChanges: () => boolean;
  clearAll?: () => void;
}

const getRegistry = (): UnsavedChangesRegistryLike | undefined =>
  (window as unknown as { __d2eUnsavedChangesRegistry?: UnsavedChangesRegistryLike }).__d2eUnsavedChangesRegistry;

/**
 * Guards a state change (e.g. switching dataset/release) against unsaved changes
 * reported by any mounted micro-frontend via `window.__d2eUnsavedChangesRegistry`.
 *
 * The change is committed ONLY when it is safe: immediately if nothing is dirty,
 * or after the user confirms "Leave" in the dialog. This keeps the source
 * control (e.g. a dropdown bound to portal state) from optimistically moving to
 * the new value and getting stuck there when the user chooses "Stay".
 *
 * Usage:
 *   const guard = useGuardedChange();
 *   <Select onChange={id => guard.request(() => commit(id))} />
 *   <UnsavedChangesDialog open={guard.open} onLeave={guard.onLeave} onCancel={guard.onCancel} />
 */
export interface GuardedChange {
  open: boolean;
  request: (commit: () => void) => void;
  onLeave: () => void;
  onCancel: () => void;
}

export const useGuardedChange = (): GuardedChange => {
  const [open, setOpen] = useState(false);
  const pendingCommitRef = useRef<(() => void) | null>(null);

  const request = useCallback((commit: () => void) => {
    if (getRegistry()?.hasAnyUnsavedChanges()) {
      pendingCommitRef.current = commit;
      setOpen(true);
      return;
    }
    commit();
  }, []);

  const onLeave = useCallback(() => {
    const commit = pendingCommitRef.current;
    pendingCommitRef.current = null;
    setOpen(false);
    // Acknowledge the abandon so dirty apps reset and do not re-block.
    getRegistry()?.clearAll?.();
    commit?.();
  }, []);

  const onCancel = useCallback(() => {
    pendingCommitRef.current = null;
    setOpen(false);
  }, []);

  return { open, request, onLeave, onCancel };
};

export default useGuardedChange;
