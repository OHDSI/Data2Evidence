import React, { FC, useEffect, useState } from "react";

type Props = {
  datasetId: string;
  username: string;
  getToken(): Promise<string>;
  toggleAtlas?(val: boolean, path: string): void;
  atlasPath: string;
};
// Atlas3 stores its auth token in localStorage under this key and restores the
// session from it on boot (initializeFromStorage). The portal and the /atlas
// iframe are the same origin, so localStorage is shared between them.
const ATLAS_TOKEN_KEY = "bearerToken";

// Map a (possibly Atlas Lite) deep-link path to the equivalent Atlas3 hash route.
//   Atlas Lite                     -> Atlas3
//   /#/cohortdefinition/{id}       -> /#/cohorts/{id}   (specific cohort definition)
//   /#/cohortdefinitions           -> /#/cohorts        (cohort definitions list)
const toAtlas3Path = (path: string): string => {
  if (!path) return "/#/cohorts";
  const match = path.match(/^\/#\/cohortdefinition\/(\d+)/);
  if (match) return `/#/cohorts/${match[1]}`;
  if (path.startsWith("/#/cohortdefinitions")) return "/#/cohorts";
  return path;
};

export const Atlas: FC<Props> = ({ datasetId, getToken, username, toggleAtlas, atlasPath }) => {
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const [tokenInterval, setTokenInterval] = useState<NodeJS.Timer | null>(null);
  const [tokenReady, setTokenReady] = useState(false);

  // Seed the token into shared (same-origin) localStorage BEFORE the iframe
  // loads, so Atlas3 authenticates on boot without showing its login screen.
  // trex's authn middleware exchanges this Logto token for a WebAPI token on
  // each /WebAPI/* request.
  useEffect(() => {
    const preloadToken = async () => {
      const token = await getToken();
      localStorage.setItem(ATLAS_TOKEN_KEY, token);
      setTokenReady(true);
    };
    preloadToken();
  }, [datasetId, username, getToken]);

  useEffect(() => {
    const originUrl = `${window.location.protocol}//${window.location.hostname}${
      window.location.port ? ":" + window.location.port : ""
    }`;
    const fn = (event: MessageEvent) => {
      if (event.origin !== originUrl || event.data.type !== "CLOSE_ATLAS") {
        return;
      }
      toggleAtlas?.(false, "");
    };
    window.addEventListener("message", fn);
    return () => {
      removeEventListener("message", fn);
    };
  }, []);

  // Keep the shared localStorage token fresh so Atlas3 keeps using a valid
  // token across refreshes.
  const sendToken = async () => {
    const token = await getToken();
    if (token) {
      localStorage.setItem(ATLAS_TOKEN_KEY, token);
    }
  };

  useEffect(() => {
    if (!tokenReady) return;

    // Send on interval to handle token refresh
    const interval = setInterval(sendToken, 1000);
    setTokenInterval(interval);

    return () => {
      if (tokenInterval) {
        clearInterval(tokenInterval);
      }
    };
  }, [tokenReady]);

  const handleIframeLoad = async () => {
    // Send token via postMessage as well for redundancy
    sendToken();
  };

  // Don't render iframe until token is pre-loaded in sessionStorage
  if (!tokenReady) {
    return <div>Loading...</div>;
  }

  return (
    <iframe
      ref={iframeRef}
      src={`/atlas${toAtlas3Path(atlasPath)}`}
      onLoad={handleIframeLoad}
      style={{ width: "100%", height: "calc(100% - 6px)", border: "none" }}
      title="Atlas"
    />
  );
};

export default Atlas;
