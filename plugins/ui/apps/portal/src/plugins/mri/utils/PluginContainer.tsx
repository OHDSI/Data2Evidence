import React, { FC, ReactNode, useEffect } from "react";
import { useToken, useTranslation } from "../../../contexts";
import { useFeatures } from "../../../hooks";
import env from "../../../env";
import "./PluginContainer.scss";

interface PluginContainerProps {
  getToken?: () => Promise<string>;
  qeSvcUrl?: string;
  studyId?: string;
  releaseId?: string;
  children?: ReactNode;
}

const nameProp = env.REACT_APP_IDP_NAME_PROP;

const PluginContainer: FC<PluginContainerProps> = ({
  children,
  getToken,
  qeSvcUrl,
  studyId,
  releaseId,
}) => {
  const { idTokenClaims } = useToken();
  const { locale } = useTranslation();
  const [features, featuresLoading] = useFeatures();

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
            features,
            featuresLoading,
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
