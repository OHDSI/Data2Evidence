import { PageProps, ResearcherStudyMetadata } from "@portal/plugin";
import { FC, useEffect, useRef, useState } from "react";
import "./ShinyLive.scss";

interface ShinyLiveProps extends PageProps<ResearcherStudyMetadata> {}

export const ShinyLive: FC<ShinyLiveProps> = ({ metadata }: ShinyLiveProps) => {
  const [iframeUrl, setIframeUrl] = useState<string>("");
  const [error, setError] = useState<string>("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

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

        const url = `${window.location.origin}/d2e/gateway/api/dataset/shiny-live/${metadata.studyId}_dashboard_testing_r/`;
        console.log("[Dashboard] Setting iframe URL:", url);
        setIframeUrl(url);
      } catch (err) {
        console.error("[Dashboard] Error setting up Dashboard:", err);
        setError(err instanceof Error ? err.message : "Failed to load Dashboard application");
      }
    };

    setupIframe();
  }, [metadata?.studyId, metadata]);

  const handleIframeLoad = () => {
    console.log("[Dashboard] Iframe loaded successfully");
  };

  return (
    <div className="shinylive-plugin">
      <div className="shinylive-plugin__content">
        {error ? (
          <div className="shinylive-plugin__error">
            <p>Error: {error}</p>
          </div>
        ) : iframeUrl ? (
          <>
            <iframe
              ref={iframeRef}
              src={iframeUrl}
              title="Dashboard Application"
              className="shinylive-plugin__iframe"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              onLoad={handleIframeLoad}
            />
          </>
        ) : (
          <div className="shinylive-plugin__loading">Loading Dashboard application...</div>
        )}
      </div>
    </div>
  );
};
