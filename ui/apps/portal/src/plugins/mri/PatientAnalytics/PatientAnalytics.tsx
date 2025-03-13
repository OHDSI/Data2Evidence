import React, { FC, useEffect } from "react";
import { PageProps, ResearcherStudyMetadata } from "@portal/plugin";
import PAPlugin from "../utils/PAPlugin";

interface PatientAnalyticsProps extends PageProps<ResearcherStudyMetadata> {}

export const PatientAnalytics: FC<PatientAnalyticsProps> = ({ metadata }) => {
  useEffect(() => {
    return () => {
      if (window.d2eListeners?.["alp-dataset-change"]) {
        const listeners = window.d2eListeners["alp-dataset-change"];
        for (let i = listeners.length - 1; i >= 0; i--) {
          if (listeners[i].app === "patient-analytics") {
            window.removeEventListener("alp-dataset-change", listeners[i].listener);
            listeners.splice(i, 1);
          }
        }
      }
    };
  }, []);
  return (
    <PAPlugin
      tenantId={metadata?.tenantId}
      studyId={metadata?.studyId}
      releaseId={metadata?.releaseId}
      getToken={metadata?.getToken}
    />
  );
};
