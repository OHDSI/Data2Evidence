import React, { FC, useEffect, useState } from "react";

type Props = {
  datasetId: string;
  username: string;
  getToken(): Promise<string>;
  toggleAtlas?(val: boolean, path: string): void;
  atlasPath: string;
};
export const Atlas: FC<Props> = ({ datasetId, getToken, username, toggleAtlas, atlasPath }) => {
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const [tokenInterval, setTokenInterval] = useState<NodeJS.Timer | null>(null);
  const [tokenReady, setTokenReady] = useState(false);

  // Pre-populate sessionStorage with token BEFORE iframe loads
  // Portal and Atlas iframe share the same origin, so they share sessionStorage
  useEffect(() => {
    const preloadToken = async () => {
      const token = await getToken();
      sessionStorage.setItem("d2e-token", token);
      sessionStorage.setItem("d2e-datasetId", datasetId);
      sessionStorage.setItem("d2e-username", username);
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

  const sendToken = async () => {
    if (iframeRef?.current?.contentWindow) {
      const token = await getToken();
      iframeRef.current.contentWindow.postMessage(
        {
          type: "SETUP_ATLAS",
          token,
          datasetId,
          username,
        },
        `${window.location.protocol}//${window.location.hostname}:${window.location.port}`
      );
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
      src={`/atlas${atlasPath}`}
      onLoad={handleIframeLoad}
      style={{ width: "100%", height: "calc(100% - 6px)", border: "none" }}
      title="Atlas Lite"
    />
  );
};

export default Atlas;
