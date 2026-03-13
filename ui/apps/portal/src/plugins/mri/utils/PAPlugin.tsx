import React, { FC, useEffect, useState } from "react";
import env from "../../../env";
import { loadEsModuleScript, loadStyleSheet, loadSapScript } from "../../../utils/loadScript";
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
    let isMounted = true;
    const callbacks: (() => void)[] = [];
    const cacheKey = `${studyId || "default"}_${releaseId || "default"}_${Date.now()}`;
    setIsLoading(true);

    fetch(PA_ASSETS_URL)
      .then((response) => response.json())
      .then(({ css, js }) => {
        if (!isMounted) return;

        loadSapScript(() => {
          if (!isMounted) return;

          css.forEach((href: string) => {
            callbacks.push(loadStyleSheet(href));
          });

          js.forEach((src: string) => {
            const cacheBustedSrc = `${src}?v=${cacheKey}`;
            callbacks.push(loadEsModuleScript(cacheBustedSrc, () => {}));
          });

          hideLogoutButton();
        });
      })
      .catch((error) => {
        console.error("Failed to load Patient Analytics assets:", error);
      });

    return () => {
      isMounted = false;
      callbacks.forEach((cleanup) => cleanup());
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
