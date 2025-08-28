import React, { FC, useCallback, useEffect, useMemo } from "react";
import env from "../../../env";

export const FlowiseSetup: FC = () => {
  const flowiseUrl = useMemo(() => {
    const configured = (env as any).REACT_APP_FLOWWISE_URL as string | undefined;
    if (configured && configured.length > 0) return configured;

    // Default: reverse-proxied path (works in local stack and production)
    return "/flowise/";
  }, []);

  const openFlowise = useCallback(() => {
    window.location.assign(flowiseUrl);
  }, [flowiseUrl]);

  useEffect(() => {
    // Attempt direct navigation immediately
    openFlowise();
  }, [openFlowise]);

  return (
    <div style={{ padding: 16 }}>
      <h3>Opening Flowise…</h3>
      <p>If you are not redirected automatically, click the button below.</p>
      <button onClick={openFlowise}>Open Flowise</button>
    </div>
  );
};
