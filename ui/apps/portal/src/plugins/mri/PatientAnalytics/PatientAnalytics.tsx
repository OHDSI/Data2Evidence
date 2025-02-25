import React, { FC } from "react";
import { PageProps, ResearcherStudyMetadata } from "@portal/plugin";
import PAPlugin from "../utils/PAPlugin";

interface PatientAnalyticsProps extends PageProps<ResearcherStudyMetadata> {}

export const PatientAnalytics: FC<PatientAnalyticsProps> = ({ metadata }) => (
  <PAPlugin
    tenantId={metadata?.tenantId}
    studyId={metadata?.studyId}
    releaseId={metadata?.releaseId}
    getToken={metadata?.getToken}
  />
);
