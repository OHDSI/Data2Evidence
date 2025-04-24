import React, { FC } from "react";
import { PageProps, ResearcherStudyMetadata } from "@portal/plugin";
import PAPlugin from "../utils/PAPlugin";

interface SearchProps extends PageProps<ResearcherStudyMetadata> {}

export const Search: FC<SearchProps> = ({ metadata }) => (
  <PAPlugin tenantId={metadata?.tenantId} studyId={metadata?.studyId} getToken={metadata?.getToken} />
);
