import React, { FC, useMemo } from "react";
import env from "../../../env";

export const FlowiseSetup: FC = () => {
  const flowiseUrl = useMemo(() => {
    const configured = (env as any).REACT_APP_FLOWISE_URL as string | undefined;
    if (configured && configured.length > 0) return configured;

    // Check if running in development mode (standalone UI on port 4000)
    const isDevelopment = window.location.port === "4000";
    if (isDevelopment) {
      // In development, use the full URL to the Flowise service
      return "https://localhost:41100/flowise/";
    }

    // Default: reverse-proxied path (works in local stack and production)
    return "/flowise/";
  }, []);

  return (
    <div style={{ 
      width: '100%', 
      height: 'calc(100vh - 100px)', 
      display: 'flex', 
      flexDirection: 'column' 
    }}>
      <iframe
        src={flowiseUrl}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          flexGrow: 1
        }}
        title="Flowise"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
};
