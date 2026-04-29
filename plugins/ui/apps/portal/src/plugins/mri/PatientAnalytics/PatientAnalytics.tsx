import React, { FC, useCallback, useState, useEffect } from "react";
import { PageProps, ResearcherStudyMetadata } from "@portal/plugin";
import PAPlugin from "../utils/PAPlugin";
import Atlas from "./Atlas";
import env from "../../../env";
import { useToken } from "../../../contexts";

interface PatientAnalyticsProps extends PageProps<ResearcherStudyMetadata> {}

const nameProp = env.REACT_APP_IDP_NAME_PROP;

export const PatientAnalytics: FC<PatientAnalyticsProps> = ({ metadata }) => {
  const { idTokenClaims } = useToken();
  const [showAtlas, setShowAtlas] = useState(false);
  const [atlasPath, setAtlasPath] = useState(""); // path is relative to '/atlas'

  const toggleAtlas = useCallback((value: boolean, path: string) => {
    setShowAtlas(value);
    setAtlasPath(path);
  }, []);

  const removeDatasetChangeListener = useCallback(() => {
    if (window.d2eListeners?.["alp-dataset-change"]) {
      const listeners = window.d2eListeners["alp-dataset-change"];
      for (let i = listeners.length - 1; i >= 0; i--) {
        if (listeners[i].app === "patient-analytics") {
          window.removeEventListener("alp-dataset-change", listeners[i].listener);
          listeners.splice(i, 1);
        }
      }
    }
  }, []);

  useEffect(() => {
    // When changing from PA to Atlas screens, remove listeners to avoid duplicates
    if (showAtlas) {
      removeDatasetChangeListener();
    }
    return removeDatasetChangeListener;
  }, [showAtlas]);

  if (showAtlas && metadata) {
    return (
      <Atlas
        datasetId={metadata.studyId}
        getToken={metadata.getToken}
        username={idTokenClaims[nameProp]}
        toggleAtlas={toggleAtlas}
        atlasPath={atlasPath}
      />
    );
  }

  return (
    <PAPlugin
      tenantId={metadata?.tenantId}
      studyId={metadata?.studyId}
      releaseId={metadata?.releaseId}
      getToken={metadata?.getToken}
      toggleAtlas={toggleAtlas}
    />
  );
};
