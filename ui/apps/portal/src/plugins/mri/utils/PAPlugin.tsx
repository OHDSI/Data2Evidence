import React, { FC, useEffect, useState } from "react";
import env from "../../../env";
import { loadModuleScript, loadStyleSheet, loadSapScript, loadScriptWithCallback } from "../../../utils/loadScript";
import PluginContainer from "./PluginContainer";
import { Loader } from "@portal/components";

interface PAPluginProps {
  tenantId?: string;
  studyId?: string;
  releaseId?: string;
  getToken?: () => Promise<string>;
  toggleAtlas?(val: boolean, path: string): void;
}

const PA_ASSETS_URL = "mri/assets.json";
const D3_CDN_URL = "https://d3js.org/d3.v3.min.js";
const VUE_APP_HOST = env.REACT_APP_DN_BASE_URL.endsWith("/")
  ? `${env.REACT_APP_DN_BASE_URL}d2e`
  : `${env.REACT_APP_DN_BASE_URL}/d2e`;

const PAPlugin: FC<PAPluginProps> = ({ studyId, releaseId, getToken, toggleAtlas }) => {
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

    // Load D3 v3 from CDN first, then load vue-mri-ui-lib scripts
    // D3 must be available as window.d3 before the Vue app initializes
    const d3Callback = loadScriptWithCallback(D3_CDN_URL, () => {
      fetch(PA_ASSETS_URL)
        .then((response) => response.json())
        .then(({ css, js }) => {
          loadSapScript(() => {
            const styleSheetCallbacks = css.map(loadStyleSheet);
            // Use loadModuleScript to load Vite-built ES modules with type="module"
            const scriptCallbacks = js.map(loadModuleScript);
            hideLogoutButton();
            callbacks = [d3Callback, ...scriptCallbacks, ...styleSheetCallbacks];
          });
        });
    });

    //Remove scripts and links upon component unmounting
    return () => {
      callbacks.forEach((callback) => callback());
    };
  }, [isLocalDev]);

  return (
    <PluginContainer
      studyId={studyId}
      releaseId={releaseId}
      getToken={getToken}
      qeSvcUrl={VUE_APP_HOST}
      toggleAtlas={toggleAtlas}
    >
      <div className="vue-main">{isLoading && <Loader />}</div>
    </PluginContainer>
  );
};

export default PAPlugin;
