import { DescriptionOutlined } from "@mui/icons-material";
import { FC, useEffect, useRef, useState } from "react";
import "./DashboardIframe.scss";

export interface DashboardIframeProps {
  url: string;
  token: string;
  title?: string;
  loadingMessage?: string;
  errorMessage?: string;
  onLoad?: () => void;
}

export const DashboardIframe: FC<DashboardIframeProps> = ({
  url,
  token,
  title = "Dashboard Application",
  loadingMessage = "Loading Dashboard application...",
  errorMessage,
  onLoad,
}) => {
  const [iframeUrl, setIframeUrl] = useState<string>("");
  const [error, setError] = useState<string>(errorMessage || "");
  const [currentToken, setCurrentToken] = useState<string>(token);
  const [isIframeOpen, setIsIframeOpen] = useState<boolean>(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Update error when errorMessage prop changes
  useEffect(() => {
    if (errorMessage) {
      setError(errorMessage);
    }
  }, [errorMessage]);

  // Update currentToken when initial token prop changes (but don't override refreshed tokens)
  useEffect(() => {
    if (token && token !== currentToken) {
      console.log("[DashboardIframe] Initial token updated from parent");
      setCurrentToken(token);
    }
  }, [token, currentToken]);

  // Setup iframe URL after token is available
  useEffect(() => {
    const setupIframe = async () => {
      if (!url || !currentToken) {
        return;
      }

      try {
        // Set the token in a cookie so the iframe requests will be authenticated
        document.cookie = `authtoken=${currentToken}; path=/; secure; SameSite=Strict;`;

        console.log("[DashboardIframe] Setting iframe URL:", url);

        // Check if the dashboard exists before loading iframe
        const checkResponse = await fetch(url, {
          method: "HEAD",
          credentials: "include",
        });

        if (checkResponse.status === 404) {
          console.error("[DashboardIframe] Dashboard not found (404)");
          setError("Dashboard not found. The application may not have been created yet.");
          return;
        }

        if (!checkResponse.ok) {
          console.error(`[DashboardIframe] Dashboard check failed with status ${checkResponse.status}`);
          setError(`Failed to load dashboard (status ${checkResponse.status})`);
          return;
        }

        setIframeUrl(url);
        setIsIframeOpen(true);
        setError(""); // Clear any previous errors
      } catch (err) {
        console.error("[DashboardIframe] Error setting up Dashboard:", err);
        setError(err instanceof Error ? err.message : "Failed to load Dashboard application");
      }
    };

    setupIframe();
  }, [url, currentToken]);

  // Handle token refresh and iframe cookie updates
  useEffect(() => {
    // Set cookie in iframe when it loads
    if (isIframeOpen && iframeRef.current && iframeRef.current.contentWindow && currentToken) {
      try {
        iframeRef.current.contentWindow.document.cookie = `authtoken=${currentToken}; path=/; secure; SameSite=Strict;`;
      } catch (error) {
        console.error("[DashboardIframe] Error setting cookie in iframe:", error);
      }
    }

    // Listen for token refresh events
    const onTokenRefreshed = (e: Event) => {
      const refreshedToken = (e as CustomEvent)?.detail?.accessToken as string | undefined;
      if (!refreshedToken) return;

      console.log("[DashboardIframe] Token refreshed via OIDC event, updating cookies");
      setCurrentToken(refreshedToken);

      // Update parent document cookie
      document.cookie = `authtoken=${refreshedToken}; path=/; secure; SameSite=Strict;`;

      // Update iframe cookie and reload if iframe is open
      if (isIframeOpen && iframeRef.current?.contentWindow) {
        try {
          iframeRef.current.contentWindow.document.cookie = `authtoken=${refreshedToken}; path=/; secure; SameSite=Strict;`;
        } catch (err) {
          console.error("[DashboardIframe] Error updating iframe cookie after OIDC refresh:", err);
        }

        // Cache-bust the iframe URL to force reload with new token
        try {
          const src = new URL(iframeUrl);
          src.searchParams.set("t", Date.now().toString());
          iframeRef.current.src = src.toString();
        } catch (err) {
          console.warn("[DashboardIframe] Cache-busting failed; resetting to base URL", err);
          if (iframeRef.current && iframeUrl) {
            iframeRef.current.src = iframeUrl;
          }
        }
      }
    };

    window.addEventListener("oidc:token_refreshed", onTokenRefreshed as EventListener);
    return () => window.removeEventListener("oidc:token_refreshed", onTokenRefreshed as EventListener);
  }, [isIframeOpen, currentToken, iframeUrl]);

  const handleIframeLoad = () => {
    console.log("[DashboardIframe] Iframe loaded successfully");

    // Set cookie in iframe after it loads
    if (iframeRef.current?.contentWindow && currentToken) {
      try {
        iframeRef.current.contentWindow.document.cookie = `authtoken=${currentToken}; path=/; secure; SameSite=Strict;`;
      } catch (error) {
        console.error("[DashboardIframe] Error setting cookie in iframe on load:", error);
      }
    }

    // Call optional onLoad callback
    if (onLoad) {
      onLoad();
    }
  };

  return (
    <div className="dashboard-iframe">
      <div className="dashboard-iframe__content">
        {error ? (
          <div className="dashboard-iframe__empty-state">
            <DescriptionOutlined className="dashboard-iframe__empty-icon" />
            <h3 className="dashboard-iframe__empty-title">Dashboard Not Available</h3>
            <p className="dashboard-iframe__empty-message">{error}</p>
          </div>
        ) : iframeUrl ? (
          <iframe
            ref={iframeRef}
            src={iframeUrl}
            title={title}
            className="dashboard-iframe__iframe"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            onLoad={handleIframeLoad}
          />
        ) : (
          <div className="dashboard-iframe__loading">{loadingMessage}</div>
        )}
      </div>
    </div>
  );
};
