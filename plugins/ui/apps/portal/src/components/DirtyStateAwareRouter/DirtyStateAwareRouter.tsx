import React, { FC, ReactNode, useCallback, useRef, useState } from "react";
import { unstable_HistoryRouter as HistoryRouter } from "react-router-dom";
import { createBrowserHistory, History, To } from "@remix-run/router";
import { UnsavedChangesDialog } from "../UnsavedChangesDialog/UnsavedChangesDialog";

/**
 * Synchronous contract exposed by vue-mri-ui-lib (and any future microfrontend)
 * so the portal shell can ask "is anybody dirty?" before leaving a plugin.
 */
interface D2EUnsavedChangesRegistry {
  hasAnyUnsavedChanges: () => boolean;
  getDirtyApps: () => string[];
}

declare global {
  interface Window {
    __d2eUnsavedChangesRegistry?: D2EUnsavedChangesRegistry;
  }
}

type PendingNavigation =
  | { type: "push"; to: To; state?: unknown }
  | { type: "replace"; to: To; state?: unknown }
  | null;

export interface DirtyStateAwareRouterProps {
  basename?: string;
  children?: ReactNode;
  history?: History;
}

export const DirtyStateAwareRouter: FC<DirtyStateAwareRouterProps> = ({
  basename,
  children,
  history: injectedHistory,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const pendingNavigation = useRef<PendingNavigation>(null);
  const historyRef = useRef<History | null>(null);
  const originalPushRef = useRef<((to: To, state?: unknown) => void) | null>(null);
  const originalReplaceRef = useRef<((to: To, state?: unknown) => void) | null>(null);

  if (!historyRef.current) {
    const history = injectedHistory ?? createBrowserHistory({ v5Compat: true });
    const originalPush = history.push.bind(history);
    const originalReplace = history.replace.bind(history);

    originalPushRef.current = originalPush;
    originalReplaceRef.current = originalReplace;

    history.push = (to: To, state?: unknown) => {
      if (window.__d2eUnsavedChangesRegistry?.hasAnyUnsavedChanges()) {
        pendingNavigation.current = { type: "push", to, state };
        setDialogOpen(true);
        return;
      }
      originalPush(to, state);
    };

    history.replace = (to: To, state?: unknown) => {
      if (window.__d2eUnsavedChangesRegistry?.hasAnyUnsavedChanges()) {
        pendingNavigation.current = { type: "replace", to, state };
        setDialogOpen(true);
        return;
      }
      originalReplace(to, state);
    };

    historyRef.current = history;
  }

  const handleLeave = useCallback(() => {
    setDialogOpen(false);
    const navigation = pendingNavigation.current;
    pendingNavigation.current = null;

    if (!navigation || !historyRef.current) {
      return;
    }

    if (navigation.type === "push") {
      originalPushRef.current?.(navigation.to, navigation.state);
    } else {
      originalReplaceRef.current?.(navigation.to, navigation.state);
    }
  }, []);

  const handleCancel = useCallback(() => {
    pendingNavigation.current = null;
    setDialogOpen(false);
  }, []);

  return (
    <HistoryRouter history={historyRef.current} basename={basename}>
      {children}
      <UnsavedChangesDialog open={dialogOpen} onLeave={handleLeave} onCancel={handleCancel} />
    </HistoryRouter>
  );
};

export default DirtyStateAwareRouter;
