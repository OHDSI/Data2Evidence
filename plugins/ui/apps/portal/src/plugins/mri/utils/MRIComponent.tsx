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

      if (typeof sap !== "undefined") {
        // sapui5 script already loaded
        const container = sap.ui.getCore().byId(containerId);
        if (!container) {
          initComponent();
        } else {
          container.placeAt(contentId);
        }
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
