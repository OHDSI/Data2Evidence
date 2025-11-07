import React, { FC, useCallback, useState } from "react";
import { PageProps, ResearcherStudyMetadata } from "@portal/plugin";
import "./SampleResearcherStudy.scss";
import { useTranslation } from "../../../contexts";

interface SampleResearcherStudyProps extends PageProps<ResearcherStudyMetadata> {}

export const SampleResearcherStudy: FC<SampleResearcherStudyProps> = ({ metadata }: SampleResearcherStudyProps) => {
  const { getText, i18nKeys } = useTranslation();
  const [token, setToken] = useState<string>();

  const handleClick = useCallback(async () => {
    if (metadata) {
      setToken(await metadata.getToken());
    }
  }, [metadata]);

  return (
    <div className="rs-plugin">
      <h1>{getText(i18nKeys.SAMPLE_RESEARCHER_STUDY__TITLE)}</h1>
      <section>
        <div>{getText(i18nKeys.SAMPLE_RESEARCHER_STUDY__HELLO, [metadata?.userId || "there!"])}</div>
        <div>{getText(i18nKeys.SAMPLE_RESEARCHER_STUDY__STUDY, [metadata?.studyId || "Untitled"])}</div>
        <button onClick={handleClick}>{getText(i18nKeys.SAMPLE_RESEARCHER_STUDY__GET_JWT_TOKEN)}</button>
        <div>{token}</div>
      </section>
    </div>
  );
};
