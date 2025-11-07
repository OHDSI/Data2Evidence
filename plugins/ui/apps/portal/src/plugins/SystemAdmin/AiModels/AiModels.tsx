import React, { FC, useState, useEffect } from "react";
import { useTranslation } from "../../../contexts";
import { i18nKeys } from "../../../contexts/app-context/states";
import { loadStyleSheet, loadScript } from "../../../utils/loadScript";
import { getAuthToken } from "../../../containers/auth";
import { Loader } from "@portal/components";
import "./AiModels.scss";

const MLFLOW_ASSETS_URL = "aimodels/build/assets.json";

const AiModels: FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchError, setIsFetchError] = useState(false);
  const { getText } = useTranslation();
  const isLocalDev = window.location.hostname === "localhost";

  const addPrefix = (arr: string[]) => arr.map((path) => `aimodels/build/${path}`);

  useEffect(() => {
    let callbacks: (() => void)[] = [];
    setIsLoading(true);
    fetch(MLFLOW_ASSETS_URL)
      .then((response) => response.json())
      .then(({ js, css }) => {
        const styleSheetCallbacks = addPrefix(css).map((url: string) => loadStyleSheet(url));
        const scriptCallbacks = addPrefix(js).map((url: string) => loadScript(url));

        callbacks = [...scriptCallbacks, ...styleSheetCallbacks];
      })
      .catch((error) => {
        setIsFetchError(true);
        console.error("Error loading mlflow ui: ", error);
      })
      .finally(() => {
        setIsLoading(false);
      });

    return () => {
      window.dispatchEvent(new CustomEvent("unmount-aimodels"));
      callbacks.forEach((callback) => callback());
    };
  }, [isLocalDev]);

  return (
    <div
      className="aimodels"
      id="mlflow-root"
      ref={(node: any) => {
        setIsLoading(false);
        if (node) {
          node.portalAPI = {
            getAuthToken,
            browserBaseUrl: "mlflow",
          };
        }
      }}
    >
      {isFetchError && <div className="aimodels__error">{getText(i18nKeys.AI_MODELS__ERROR)}</div>}
      {isLoading && <Loader />}
    </div>
  );
};

export default AiModels;
