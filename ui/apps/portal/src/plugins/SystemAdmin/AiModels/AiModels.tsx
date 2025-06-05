import React, { FC, useState, useEffect } from "react";
import { loadStyleSheet, loadScript } from "../../../utils/loadScript";
import { getAuthToken } from "../../../containers/auth";

const MLFLOW_ASSETS_URL = "aimodels/build/assets.json";

const AiModels: FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const isLocalDev = window.location.hostname === "localhost";

  const addPrefix = (arr: string[]) => arr.map((path) => `aimodels/build/${path}`);

  useEffect(() => {
    let callbacks: (() => void)[] = [];
    setIsLoading(true);
    fetch(MLFLOW_ASSETS_URL)
      .then((response) => response.json())
      .then(({ js, css }) => {
        console.log(addPrefix(css));
        const styleSheetCallbacks = addPrefix(css).map((url: string) => loadStyleSheet(url));
        const scriptCallbacks = addPrefix(js).map((url: string) => loadScript(url));

        callbacks = [...scriptCallbacks, ...styleSheetCallbacks];
      });

    return () => {
      callbacks.forEach((callback) => callback());
    };
  }, [isLocalDev]);

  return (
    <div
      className="aimodels"
      id="mlflow-root"
      ref={(node: any) => {
        if (node) {
          node.portalAPI = {
            getAuthToken,
            browserBaseUrl: "mlflow",
          };
        }
      }}
    ></div>
  );
};

export default AiModels;
