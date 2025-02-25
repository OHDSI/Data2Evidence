import React, { FC, useState } from "react";
import { PageProps, ResearcherStudyMetadata } from "@portal/plugin";
import { CohortMgmt } from "../../axios/cohort-mgmt";
import { useTranslation, useActiveDataset } from "../../contexts";
import CohortDefinitionList from "./components/CohortDefinitionList/CohortDefinitionList";
import "./Cohort.scss";
interface CohortProps extends PageProps<ResearcherStudyMetadata> {}

export const Cohort: FC<CohortProps> = ({ metadata }: CohortProps) => {
  const { getText, i18nKeys } = useTranslation();
  const { activeDataset } = useActiveDataset();
  const [refetch, setRefetch] = useState(false);

  const cohortMgmtClient = new CohortMgmt(activeDataset.id);

  const userId = metadata?.userId;

  if (!userId) {
    return <div>{getText(i18nKeys.COHORT__MISSING_USER_ID)}</div>;
  }
  return (
    <div className="cohort__container">
      <div className="cohort__content">
        <div className="cohort__content__header">{getText(i18nKeys.COHORT_PLUGIN__COHORT_MANAGEMENT)}</div>
        {userId && (
          <CohortDefinitionList
            userId={userId}
            cohortMgmtClient={cohortMgmtClient}
            refetch={refetch}
            setRefetch={setRefetch}
          />
        )}
      </div>
    </div>
  );
};
