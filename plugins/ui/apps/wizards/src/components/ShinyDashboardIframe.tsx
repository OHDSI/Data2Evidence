import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildShinyDashboardAuthMessage, buildShinyDashboardIframeUrl } from "../utils/shinyDashboardContext";
import styles from "./ShinyDashboardIframe.module.css";

interface ShinyDashboardIframeProps {
  datasetId: string;
  cohortId: number;
  wizardConfig: Record<string, unknown>;
  mriquery: string;
  getToken?: () => Promise<string>;
}

export function ShinyDashboardIframe({
  datasetId,
  cohortId,
  wizardConfig,
  mriquery,
  getToken,
}: ShinyDashboardIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const fallbackTimerRef = useRef<number | null>(null);
  const [token, setToken] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const iframeUrl = useMemo(() => buildShinyDashboardIframeUrl(datasetId, wizardConfig), [datasetId, wizardConfig]);
  const iframeOrigin = useMemo(() => {
    try {
      return new URL(iframeUrl, window.location.origin).origin;
    } catch {
      return window.location.origin;
    }
  }, [iframeUrl]);

  const sendContext = useCallback(() => {
    if (!iframeRef.current?.contentWindow || !token) return;
    iframeRef.current.contentWindow.postMessage(
      buildShinyDashboardAuthMessage({
        token,
        datasetId,
        cohortId: String(cohortId),
        wizardConfig,
        mriquery,
      }),
      iframeOrigin
    );
  }, [cohortId, datasetId, iframeOrigin, mriquery, token, wizardConfig]);

  useEffect(() => {
    let active = true;
    setToken("");
    if (!getToken) {
      setError("Authentication is unavailable for this dashboard.");
      return () => {
        active = false;
      };
    }
    void getToken()
      .then((nextToken) => {
        if (!active) return;
        if (nextToken) setToken(nextToken);
        else setError("Authentication is unavailable for this dashboard.");
      })
      .catch(() => {
        if (active) setError("Authentication failed. Please try opening the dashboard again.");
      });
    return () => {
      active = false;
    };
  }, [getToken, reloadKey]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow || event.origin !== iframeOrigin) return;
      if (event.data?.type === "SHINYLIVE_READY") {
        setIsReady(true);
        sendContext();
      } else if (event.data?.type === "SHINYLIVE_ERROR") {
        setError("The dashboard reported an error. Please try opening it again.");
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [iframeOrigin, sendContext]);

  useEffect(() => {
    if (isReady && token) sendContext();
  }, [isReady, sendContext, token]);

  useEffect(
    () => () => {
      if (fallbackTimerRef.current !== null) window.clearTimeout(fallbackTimerRef.current);
    },
    []
  );

  const handleLoad = () => {
    if (fallbackTimerRef.current !== null) window.clearTimeout(fallbackTimerRef.current);
    fallbackTimerRef.current = window.setTimeout(() => setIsReady(true), 5000);
  };

  const retryDashboard = () => {
    if (fallbackTimerRef.current !== null) window.clearTimeout(fallbackTimerRef.current);
    setError(null);
    setIsReady(false);
    setReloadKey((key) => key + 1);
  };

  if (!iframeUrl) {
    return <p className={styles.error}>This Wizard does not specify a dashboard type.</p>;
  }

  return (
    <div className={styles.wrapper}>
      {!isReady && !error && (
        <div className={styles.overlay} aria-live="polite">
          <span className={styles.spinner} aria-hidden="true" />
          <p>Loading dashboard…</p>
        </div>
      )}
      {error && (
        <div className={styles.overlay} role="alert">
          <p className={styles.error}>{error}</p>
          <button type="button" onClick={retryDashboard} className={styles.retryButton}>
            Retry dashboard
          </button>
        </div>
      )}
      <iframe
        key={`${iframeUrl}-${reloadKey}`}
        ref={iframeRef}
        src={iframeUrl}
        title="Wizard analysis dashboard"
        className={styles.iframe}
        onLoad={handleLoad}
      />
    </div>
  );
}
