import React, { FC, useEffect } from "react";
import { loadStyleSheet, loadEsModuleScript } from "../../../../utils/loadScript";
import { getAuthToken } from "../../../../containers/auth";
import "./JobsViewer.scss";

const LOG_VIEWER_ASSETS_URL = "jobs/assets.json";

const JobsViewer: FC<{
  setJobsViewerScriptsLoaded: React.Dispatch<React.SetStateAction<boolean>>;
  setJobsViewerDivLoaded: React.Dispatch<React.SetStateAction<boolean>>;
}> = ({ setJobsViewerScriptsLoaded, setJobsViewerDivLoaded }) => {
  const isLocalDev = window.location.hostname === "localhost";

  const addPrefix = (arr: string[]) => arr.map((path) => `jobs/${path}`);
  useEffect(() => {
    let callbacks: (() => void)[] = [];
    fetch(LOG_VIEWER_ASSETS_URL)
      .then((response) => response.json())
      .then(({ css, js }): void => {
        const styleSheetCallbacks = addPrefix(css).map((url: string) => loadStyleSheet(url));
        const scriptCallbacks = addPrefix(js).map((url: string) =>
          loadEsModuleScript(url, () => {
            setJobsViewerScriptsLoaded(true);
          })
        );
        callbacks = [...scriptCallbacks, ...styleSheetCallbacks];
      });
    // Remove scripts and links upon component unmounting
    return () => {
      window.dispatchEvent(new CustomEvent("unmount-jobs"));
      callbacks.forEach((callback) => callback());
    };
  }, [isLocalDev, setJobsViewerScriptsLoaded]);
  const browserBaseUrl = `${window.location.protocol}//${window.location.hostname}${
    window.location.port ? ":" + window.location.port : ""
  }/portal/systemadmin/jobs`;
  return (
    <div
      className="jobs"
      id="jobs-main"
      ref={(node: any) => {
        if (node) {
          setJobsViewerDivLoaded(true);
          node.portalAPI = {
            getAuthToken,
            browserBaseUrl,
          };
        }
      }}
    />
  );
};

export default JobsViewer;
