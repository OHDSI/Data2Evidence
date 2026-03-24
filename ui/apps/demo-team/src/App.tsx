import { useEffect, useMemo, useState } from "react";
import { PortalProps } from "./types";
import { TeamPage } from "./TeamPage";

export default function App(props: PortalProps) {
  const [customProps, setCustomProps] = useState<Partial<PortalProps>>({});

  // Listen for prop updates from the portal (same pattern as concept-sets)
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

  return <TeamPage {...mergedProps} />;
}
