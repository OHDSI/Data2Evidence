import { PageProps, ResearcherStudyMetadata } from "@portal/plugin";
import { FC, useEffect, useState } from "react";
import "./ShinyLive.scss";

interface ShinyLiveProps extends PageProps<ResearcherStudyMetadata> {}

export const ShinyLive: FC<ShinyLiveProps> = ({ metadata }: ShinyLiveProps) => {
  const [iframeUrl, setIframeUrl] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const setupIframe = async () => {
      if (!metadata?.studyId) {
        console.log("[Dashboard] No dataset selected");
        setError("No dataset selected");
        return;
      }

      try {
        // Get the token (this verifies authentication)
        const token = await metadata.getToken();

        // Set the token in a cookie so the iframe requests will be authenticated
        // The backend's authn.ts checks for 'authtoken' cookie
        document.cookie = `authtoken=${token}; path=/; secure; samesite=strict`;

        // Construct the shiny-live endpoint URL
        // In development, the UI runs on port 4000 but the API is on port 41100
        // In production, they're on the same domain, so we use a relative path
        const isDevelopment = window.location.port === "4000";
        const baseUrl = isDevelopment ? "https://localhost:41100" : window.location.origin;

        // No need to pass token in URL anymore - it's in the cookie
        const url = `${baseUrl}/d2e/gateway/api/dataset/shiny-live/${metadata.studyId}_dashboard_testing_r`;
        console.log("[Dashboard] Setting iframe URL:", url);
        setIframeUrl(url);
      } catch (err) {
        console.error("[Dashboard] Error setting up Dashboard:", err);
        setError(err instanceof Error ? err.message : "Failed to load Dashboard application");
      }
    };

    setupIframe();
  }, [metadata?.studyId, metadata]);

  return (
    <div className="shinylive-plugin">
      <div className="shinylive-plugin__content">
        {error ? (
          <div className="shinylive-plugin__error">
            <p>Error: {error}</p>
          </div>
        ) : iframeUrl ? (
          <iframe
            src={iframeUrl}
            title="Dashboard Application"
            className="shinylive-plugin__iframe"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-modals"
          />
        ) : (
          <div className="shinylive-plugin__loading">Loading Dashboard application...</div>
        )}
      </div>
    </div>
  );
};
