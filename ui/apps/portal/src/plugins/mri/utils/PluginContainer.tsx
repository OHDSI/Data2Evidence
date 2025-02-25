import React, { FC, ReactNode, useEffect } from "react";
import { useToken } from "../../../contexts";
import env from "../../../env";

interface PluginContainerProps {
  getToken?: () => Promise<string>;
  qeSvcUrl?: string;
  studyId?: string;
  releaseId?: string;
  children?: ReactNode;
}

const nameProp = env.REACT_APP_IDP_NAME_PROP;

const PluginContainer: FC<PluginContainerProps> = ({ children, getToken, qeSvcUrl, studyId, releaseId }) => {
  const { idTokenClaims } = useToken();

  useEffect(() => {
    const pluginEvent = new CustomEvent("alp-dataset-change");
    window.dispatchEvent(pluginEvent);
  }, [studyId, releaseId]);

  return (
    <span
      className="plugin-container"
      ref={(node: any) => {
        if (node) {
          node.portalAPI = {
            getToken,
            qeSvcUrl,
            studyId,
            releaseId,
            username: idTokenClaims[nameProp],
          };
        }
      }}
    >
      {children}
    </span>
  );
};

export default PluginContainer;
