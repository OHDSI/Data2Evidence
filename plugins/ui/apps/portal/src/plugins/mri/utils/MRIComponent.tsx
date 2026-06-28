import React, { FC, useEffect } from "react";
import PluginContainer from "./PluginContainer";
import { loadSapScript } from "../../../utils/loadScript";
// eslint-disable-next-line no-var
declare var sap: any;

const MRIComponent: FC<{ componentName: string; getToken?: () => Promise<string> }> = ({ componentName, getToken }) => {
  const contentId = `${componentName}-content`;
  useEffect(() => {
    try {
      const containerId = `${componentName}-container`;
      const initComponent = () => {
        // Loads and renders the new MRI component in its own container
        new sap.ui.core.ComponentContainer(containerId, {
          name: componentName,
        }).placeAt(contentId);
      };

      const reuseOrRecreateContainer = () => {
        const container = sap.ui.getCore().byId(containerId);

        if (!container) {
          initComponent();
          return;
        }

        if (typeof container.placeAt === "function") {
          container.placeAt(contentId);
          return;
        }

        if (typeof container.destroy === "function") {
          container.destroy();
        }

        initComponent();
      };

      const isRealUi5Loaded =
        typeof sap !== "undefined" &&
        sap?.ui?.core?.ComponentContainer &&
        typeof sap.ui.getCore === "function";

      if (isRealUi5Loaded) {
        // sapui5 script already loaded
        reuseOrRecreateContainer();
        return;
      }

      // sapui5 script is not removed upon component unmount to avoid redownloads
      const onLoadSapScript = () => {
        sap.ui.getCore().attachInit(initComponent);
      };
      loadSapScript(onLoadSapScript);
    } catch (error) {
      console.error("Unable to load MRI component", error);
    }
  }, [componentName, contentId]);
  return (
    <PluginContainer getToken={getToken}>
      <div id={contentId} />
    </PluginContainer>
  );
};

export default MRIComponent;
