import React, { FC, useEffect, useState } from "react";
import env from "../../../env";
import { loadScript, loadStyleSheet, loadSapScript } from "../../../utils/loadScript";
import PluginContainer from "./PluginContainer";
import { Loader } from "@portal/components";

interface PAPluginProps {
  tenantId?: string;
  studyId?: string;
  releaseId?: string;
  getToken?: () => Promise<string>;
}

const PA_ASSETS_URL = "mri/assets.json";
const VUE_APP_HOST = env.REACT_APP_DN_BASE_URL.endsWith("/")
  ? env.REACT_APP_DN_BASE_URL.slice(0, -1)
  : env.REACT_APP_DN_BASE_URL;

const PAPlugin: FC<PAPluginProps> = ({ studyId, releaseId, getToken }) => {
  const [isLoading, setIsLoading] = useState(false);
  const isLocalDev = window.location.hostname === "localhost";

  const hideLogoutButton = () => {
    const logoutButton: HTMLButtonElement | null = document.querySelector('button[id="mriBtnLogout"]');
    if (logoutButton) {
      logoutButton.style.display = "none";
    }
  };

  useEffect(() => {
    let callbacks: (() => void)[] = [];
    setIsLoading(true);
    fetch(PA_ASSETS_URL)
      .then((response) => response.json())
      .then(({ css, js }) => {
        loadSapScript(() => {
          const styleSheetCallbacks = css.map(loadStyleSheet);
          const scriptCallbacks = js.map(loadScript);
          hideLogoutButton();
          callbacks = [...scriptCallbacks, ...styleSheetCallbacks];
        });
      });
    //Remove scripts and links upon component unmounting
    return () => {
      callbacks.forEach((callback) => callback());
    };
  }, [isLocalDev]);

  return (
    <PluginContainer studyId={studyId} releaseId={releaseId} getToken={getToken} qeSvcUrl={VUE_APP_HOST}>
      <div className="vue-main" style={{ height: "100%" }}>
        {isLoading && <Loader />}
      </div>
    </PluginContainer>
  );
};

export default PAPlugin;
