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

  useEffect(() => {
    const sendToken = async () => {
      if (iframeRef?.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          {
            type: "SETUP_ATLAS",
            token: await getToken(),
            datasetId,
            username,
          },
          `${window.location.protocol}//${window.location.hostname}:${window.location.port}`
        );
      }
    };
    const interval = setInterval(sendToken, 1000);
    setTokenInterval(interval);

    return () => {
      if (tokenInterval) {
        clearInterval(tokenInterval);
      }
    };
    // No need to do anything when metadata changes since interval will already update the iframe
  }, []);

  return (
    <iframe
      ref={iframeRef}
      src={`/atlas${atlasPath}`}
      style={{ width: "100%", height: "calc(100% - 6px)", border: "none" }}
      title="Atlas Lite"
    />
  );
};

export default Atlas;
