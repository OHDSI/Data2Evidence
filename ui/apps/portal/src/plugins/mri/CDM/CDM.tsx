import React, { FC } from "react";
import { PageProps, SetupPageMetadata } from "@portal/plugin";
import MRIComponent from "../utils/MRIComponent";
import "./CDM.scss";

interface CDMProps extends PageProps<SetupPageMetadata> {}

export const CDM: FC<CDMProps> = ({ metadata }) => {
  const name = "hc.hph.cdw.config.ui";
  return <MRIComponent key={name} componentName={name} getToken={metadata?.getToken} />;
};
