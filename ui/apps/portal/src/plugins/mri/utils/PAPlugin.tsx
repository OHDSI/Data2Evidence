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

// Fire once when this module is first imported — resolves before the component mounts.
// By the time the user navigates to PA, the fetch is already in-flight or resolved.
const assetsPromise = fetch(PA_ASSETS_URL)
  .then((res) => res.json())
  .catch((err) => {
    console.error("Failed to prefetch Patient Analytics assets:", err);
    return { css: [], js: [] };
  });

let paAssetsLoadedPromise: Promise<void> | null = null;

const loadEsModuleScriptAsync = (src: string): Promise<void> =>
  new Promise((resolve) => {
    loadEsModuleScript(src, resolve);
  });

const ensurePAAssetsLoaded = (): Promise<void> => {
  if (paAssetsLoadedPromise) {
    return paAssetsLoadedPromise;
  }

  paAssetsLoadedPromise = assetsPromise
    .then(({ css, js }) =>
      new Promise<void>((resolve) => {
        loadSapScript(resolve);
      }).then(async () => {
        css.forEach((href: string) => {
          loadStyleSheet(href);
        });

        await Promise.all(js.map((src: string) => loadEsModuleScriptAsync(src)));
      }),
    )
    .catch((error) => {
      paAssetsLoadedPromise = null;
      throw error;
    });

  return paAssetsLoadedPromise;
};

const PAPlugin: FC<PAPluginProps> = ({ studyId, releaseId, getToken, toggleAtlas }) => {
  const [isLoading, setIsLoading] = useState(false);

  const hideLogoutButton = () => {
    const logoutButton: HTMLButtonElement | null = document.querySelector('button[id="mriBtnLogout"]');
    if (logoutButton) {
      logoutButton.style.display = "none";
    }
  };

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);

    ensurePAAssetsLoaded()
      .then(() => {
        if (!isMounted) return;

        window.mountPA?.();

        try {
          hideLogoutButton();
        } catch (error) {
          console.error("Failed to hide logout button:", error);
        }

        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Failed to load Patient Analytics assets:", error);
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
      window.unmountPA?.();
    };
  }, []);

  return (
    <PluginContainer
      studyId={studyId}
      releaseId={releaseId}
      getToken={getToken}
      qeSvcUrl={VUE_APP_HOST}
      toggleAtlas={toggleAtlas}
    >
      {isLoading && (
        <div className="pa-loader-overlay">
          <Loader />
        </div>
      )}
      <div className="vue-main" />
    </PluginContainer>
  );
};

export default PAPlugin;
