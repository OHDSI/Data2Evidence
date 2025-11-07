import React, { FC } from "react";
import { SubTitle, Loader } from "@portal/components";
import DQDTable from "../DQDTable/DQDTable";
import OverviewTable from "../Overview/OverviewTable/OverviewTable";
import { useDataQualityOverviewFromId, useDataQualityResultsFromId } from "../../../hooks";
import { useTranslation } from "../../../contexts";

interface DQDCombinedResultsProps {
  flowRunId: string;
  datasetId: string;
}

const DQDCombinedResults: FC<DQDCombinedResultsProps> = ({ flowRunId, datasetId }) => {
  const { getText, i18nKeys } = useTranslation();
  const [dqdOverview, loadingDqdOverview, errorDqdOverview] = useDataQualityOverviewFromId(flowRunId, datasetId);
  const [dqdResults, loadingDqdResults, errorDqdResults] = useDataQualityResultsFromId(flowRunId, datasetId);
  return (
    <>
      {/* DQD Overview table */}
      {loadingDqdOverview ? (
        <Loader text={getText(i18nKeys.DQD_COMBINED_RESULTS__LOADER_1)} />
      ) : errorDqdOverview ? (
        <div>
          {getText(i18nKeys.DQD_COMBINED_RESULTS__LOADER_MESSAGE_1)}: {errorDqdOverview.message}
        </div>
      ) : (
        dqdOverview && (
          <>
            <SubTitle>{getText(i18nKeys.DQD_COMBINED_RESULTS__OVERVIEW)}</SubTitle>
            <OverviewTable data={dqdOverview}></OverviewTable>
          </>
        )
      )}
      {/* DQD Results table */}
      {loadingDqdResults ? (
        <Loader text={getText(i18nKeys.DQD_COMBINED_RESULTS__LOADER_2)} />
      ) : errorDqdResults ? (
        <div>
          {getText(i18nKeys.DQD_COMBINED_RESULTS__LOADER_MESSAGE_2)}: {errorDqdResults.message}
        </div>
      ) : (
        dqdResults && (
          <>
            <SubTitle>{getText(i18nKeys.DQD_COMBINED_RESULTS__DETAIL)}</SubTitle>
            <DQDTable data={dqdResults}></DQDTable>
          </>
        )
      )}
    </>
  );
};

export default DQDCombinedResults;
