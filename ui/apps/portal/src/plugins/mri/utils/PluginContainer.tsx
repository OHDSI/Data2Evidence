import React, { FC, ReactNode, useEffect } from "react";
import { useToken, useTranslation } from "../../../contexts";
import env from "../../../env";

interface PluginContainerProps {
  getToken?: () => Promise<string>;
  qeSvcUrl?: string;
  studyId?: string;
  releaseId?: string;
  children?: ReactNode;
  toggleAtlas?(val: boolean, path: string): void;
}

const nameProp = env.REACT_APP_IDP_NAME_PROP;

const PluginContainer: FC<PluginContainerProps> = ({
  children,
  getToken,
  qeSvcUrl,
  studyId,
  releaseId,
  toggleAtlas,
}) => {
  const { idTokenClaims } = useToken();
  const { locale } = useTranslation();

  useEffect(() => {
    const pluginEvent = new CustomEvent("alp-dataset-change");
    window.dispatchEvent(pluginEvent);
  }, [studyId, releaseId]);

  return (
    <div
      className="plugin-container"
      ref={(node: any) => {
        if (node) {
          node.portalAPI = {
            getToken,
            qeSvcUrl,
            studyId,
            releaseId,
            username: idTokenClaims[nameProp],
            toggleAtlas,
            locale,
          };
        }
      }}
    >
      {children}
    </div>
  );
};

export default PluginContainer;
