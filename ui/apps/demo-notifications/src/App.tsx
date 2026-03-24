import { useEffect, useMemo, useState } from "react";
import { PortalProps } from "./types";
import { NotificationsPage } from "./NotificationsPage";
import { NotificationDrawer } from "./NotificationDrawer";

const NOTIFICATIONS_ROUTE = "/demo-notifications";

function AppContent(props: PortalProps) {
  const [isActiveRoute, setIsActiveRoute] = useState(
    location.pathname.endsWith(NOTIFICATIONS_ROUTE)
  );

  // Listen for route changes from the portal (same as concept-sets)
  useEffect(() => {
    const handleRouteChange: EventListener = (event: Event) => {
      const evt = event as CustomEvent<{ activeRoute: string }>;
      setIsActiveRoute(evt.detail.activeRoute === NOTIFICATIONS_ROUTE);
    };

    window.addEventListener("route-change", handleRouteChange);
    return () => {
      window.removeEventListener("route-change", handleRouteChange);
    };
  }, []);

  return (
    <>
      {/* Main UI: only visible when on /demo-notifications route */}
      {((props.autoMount != null && !props.autoMount) || isActiveRoute) && (
        <NotificationsPage {...props} />
      )}

      {/* Notification drawer: ALWAYS rendered, listens for events from other apps */}
      {/* This mirrors concept-sets' <TerminologyWithEventListener /> */}
      <NotificationDrawer />
    </>
  );
}

export default function App(props: PortalProps) {
  const [customProps, setCustomProps] = useState<Partial<PortalProps>>({});

  // Listen for prop updates from the portal
  useEffect(() => {
    const handlePropsChange = (event: Event) => {
      const { appId, ...newProps } = (event as CustomEvent).detail || {};
      if (appId === props.appId) {
        setCustomProps(newProps);
      }
    };

    window.addEventListener("custom-props-changed", handlePropsChange);
    return () => {
      window.removeEventListener("custom-props-changed", handlePropsChange);
    };
  }, [props.appId]);

  const mergedProps = useMemo(
    () => ({ ...props, ...customProps }),
    [props, customProps]
  );

  return <AppContent {...mergedProps} />;
}
