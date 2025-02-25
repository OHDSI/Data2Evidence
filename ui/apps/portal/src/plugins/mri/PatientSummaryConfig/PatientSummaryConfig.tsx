import React, { FC } from "react";
import { PageProps, SetupPageMetadata } from "@portal/plugin";
import MRIComponent from "../utils/MRIComponent";

interface PatientSummaryConfigProps extends PageProps<SetupPageMetadata> {}

export const PatientSummaryConfig: FC<PatientSummaryConfigProps> = ({ metadata }) => {
  const name = "hc.hph.patient.config.ui";
  return <MRIComponent key={name} componentName={name} getToken={metadata?.getToken} />;
};
