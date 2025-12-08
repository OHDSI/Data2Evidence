import React, { useEffect, useState, useRef } from "react";
import { getAppStatus, MOUNTED } from "single-spa";
import { Loader } from "@portal/components";
import { generateContainerId } from "./utils";

interface SingleSpaAppContainerProps {
  appName: string;
}

const wrapperStyle: React.CSSProperties = { position: "relative", width: "100%", height: "100%" };

const loaderContainerStyle: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  zIndex: 1000,
  backgroundColor: "white",
};

const containerStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  position: "relative",
};

export const SingleSpaAppContainer: React.FC<SingleSpaAppContainerProps> = ({ appName }) => {
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const containerId = generateContainerId(appName);

  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;

    const checkStatus = () => {
      const status = getAppStatus(appName);
      const mounted = status === MOUNTED;

      if (mounted) {
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }

      return { mounted };
    };
    checkStatus();

    // Start polling to detect when app mounts
    pollInterval = setInterval(() => {
      const { mounted } = checkStatus();
      if (mounted && pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    }, 100);

    const handleRouting = () => checkStatus();

    window.addEventListener("single-spa:before-routing-event", handleRouting);
    window.addEventListener("single-spa:routing-event", handleRouting);

    return () => {
      window.removeEventListener("single-spa:before-routing-event", handleRouting);
      window.removeEventListener("single-spa:routing-event", handleRouting);

      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [appName]);

  return (
    <div style={wrapperStyle}>
      {isLoading && (
        <div style={loaderContainerStyle}>
          <Loader />
        </div>
      )}
      <div ref={containerRef} id={containerId} style={containerStyle} />
    </div>
  );
};
