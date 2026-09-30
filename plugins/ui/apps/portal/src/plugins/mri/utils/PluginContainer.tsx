import React, { FC, ReactNode, useEffect } from "react";
import { useTranslation } from "../../../contexts";
import { useFeatures, useMe } from "../../../hooks";
import "./PluginContainer.scss";

interface PluginContainerProps {
  getToken?: () => Promise<string>;
  qeSvcUrl?: string;
  studyId?: string;
  releaseId?: string;
  children?: ReactNode;
}

const PluginContainer: FC<PluginContainerProps> = ({
  children,
  getToken,
  qeSvcUrl,
  studyId,
  releaseId,
}) => {
  const { locale } = useTranslation();
  const [features, featuresLoading] = useFeatures();
  const [username, usernameLoading] = useMe();

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
            username,
            usernameLoading,
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
