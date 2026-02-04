import { DescriptionOutlined } from "@mui/icons-material";
import { PageProps, ResearcherStudyMetadata } from "@portal/plugin";
import { FC, useEffect, useRef, useState } from "react";
import "./ShinyLive.scss";

interface ShinyLiveProps extends PageProps<ResearcherStudyMetadata> {}

export const ShinyLive: FC<ShinyLiveProps> = ({ metadata }: ShinyLiveProps) => {
  const [iframeUrl, setIframeUrl] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [bearerToken, setBearerToken] = useState<string>("");
  const [isIframeOpen, setIsIframeOpen] = useState<boolean>(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const fetchToken = async () => {
      if (!metadata?.studyId) {
        console.log("[Dashboard] No dataset selected");
        setError("No dataset selected");
        return;
      }

      try {
        const token = await metadata.getToken();
        if (token) {
          setBearerToken(token);
        }
      } catch (error) {
        console.error("[Dashboard] Error fetching auth token:", error);
        setError("Failed to authenticate");
      }
    };

    fetchToken();
  }, [metadata?.studyId, metadata]);

  // Setup iframe URL after token is available
  useEffect(() => {
    const setupIframe = async () => {
      if (!metadata?.studyId || !bearerToken) {
        return;
      }

      try {
        // Set the token in a cookie so the iframe requests will be authenticated
        document.cookie = `authtoken=${bearerToken}; path=/; secure; SameSite=Strict;`;

        const url = `${window.location.origin}/d2e/gateway/api/dataset/shiny-live/${metadata.studyId}_dashboard_testing_r/`;
        console.log("[Dashboard] Setting iframe URL:", url);

        // Check if the dashboard exists before loading iframe
        const checkResponse = await fetch(url, {
          method: "HEAD",
          credentials: "include",
        });

        if (checkResponse.status === 404) {
          console.error("[Dashboard] Dashboard not found (404)");
          setError("Dashboard not found. The application may not have been created yet.");
          return;
        }

        if (!checkResponse.ok) {
          console.error(`[Dashboard] Dashboard check failed with status ${checkResponse.status}`);
          setError(`Failed to load dashboard (status ${checkResponse.status})`);
          return;
        }

        setIframeUrl(url);
        setIsIframeOpen(true);
      } catch (err) {
        console.error("[Dashboard] Error setting up Dashboard:", err);
        setError(err instanceof Error ? err.message : "Failed to load Dashboard application");
      }
    };

    setupIframe();
  }, [metadata?.studyId, bearerToken]);

  // Handle token refresh and iframe cookie updates
  useEffect(() => {
    if (isIframeOpen && iframeRef.current && iframeRef.current.contentWindow && bearerToken) {
      try {
        iframeRef.current.contentWindow.document.cookie = `authtoken=${bearerToken}; path=/; secure; SameSite=Strict;`;
      } catch (error) {
        console.error("[Dashboard] Error setting cookie in iframe:", error);
      }
    }

    // Listen for token refresh events
    const onTokenRefreshed = (e: Event) => {
      const token = (e as CustomEvent)?.detail?.accessToken as string | undefined;
      if (!token) return;

      console.log("[Dashboard] Token refreshed, updating cookies");
      setBearerToken(token);

      // Update parent document cookie
      document.cookie = `authtoken=${token}; path=/; secure; SameSite=Strict;`;

      // Update iframe cookie and reload if iframe is open
      if (isIframeOpen && iframeRef.current?.contentWindow) {
        try {
          iframeRef.current.contentWindow.document.cookie = `authtoken=${token}; path=/; secure; SameSite=Strict;`;
        } catch (err) {
          console.error("[Dashboard] Error updating iframe cookie after OIDC refresh:", err);
        }

        // Cache-bust the iframe URL to force reload with new token
        try {
          const src = new URL(iframeRef.current.src);
          src.searchParams.set("t", Date.now().toString());
          iframeRef.current.src = src.toString();
        } catch (err) {
          console.warn("[Dashboard] Cache-busting failed; resetting to base URL", err);
          if (iframeRef.current && iframeUrl) {
            iframeRef.current.src = iframeUrl;
          }
        }
      }
    };

    window.addEventListener("oidc:token_refreshed", onTokenRefreshed as EventListener);
    return () => window.removeEventListener("oidc:token_refreshed", onTokenRefreshed as EventListener);
  }, [isIframeOpen, bearerToken, iframeUrl]);

  const handleIframeLoad = () => {
    console.log("[Dashboard] Iframe loaded successfully");

    // Set cookie in iframe after it loads
    if (iframeRef.current?.contentWindow && bearerToken) {
      try {
        iframeRef.current.contentWindow.document.cookie = `authtoken=${bearerToken}; path=/; secure; SameSite=Strict;`;
      } catch (error) {
        console.error("[Dashboard] Error setting cookie in iframe on load:", error);
      }
    }
  };

  return (
    <div className="shinylive-plugin">
      <div className="shinylive-plugin__content">
        {error ? (
          <div className="shinylive-plugin__empty-state">
            <DescriptionOutlined className="shinylive-plugin__empty-icon" />
            <h3 className="shinylive-plugin__empty-title">Dashboard Not Available</h3>
            <p className="shinylive-plugin__empty-message">{error}</p>
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
