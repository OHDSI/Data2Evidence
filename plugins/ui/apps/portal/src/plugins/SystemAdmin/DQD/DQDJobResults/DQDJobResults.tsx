import React, { FC, useState, useEffect } from "react";

import { useDatasetLatestFlowRun, useDataQualityOverviewFromId, useDataQualityResultsFromId } from "../../../../hooks";
import { Loader } from "@portal/components";
import OverviewTable from "../../../../components/DQD/Overview/OverviewTable/OverviewTable";
import DQDTable from "../../../../components/DQD/DQDTable/DQDTable";
import { FlowRunJobStateTypes, DQD_TABLE_TYPES } from "../types";
import DownloadDataButtons from "../DownloadDataButtons/DownloadDataButtons";
import DataCharacterizationReports from "../../../../components/DQD/DataCharacterizationReports/DataCharacterizationReports";
import { useTranslation } from "../../../../contexts";
const inProgressJobStates = [
  FlowRunJobStateTypes.SCHEDULED,
  FlowRunJobStateTypes.PENDING,
  FlowRunJobStateTypes.RUNNING,
  FlowRunJobStateTypes.PAUSED,
];

const cancelledJobStates = [FlowRunJobStateTypes.CANCELLING, FlowRunJobStateTypes.CANCELLED];

const failedJobStates = [FlowRunJobStateTypes.FAILED, FlowRunJobStateTypes.CRASHED];

interface DQDJobResultsProps {
  datasetId: string;
  datasetName: string;
  tableType: string;
  activeReleaseId?: string;
}

export const DQDJobResults: FC<DQDJobResultsProps> = ({ datasetId, datasetName, tableType, activeReleaseId }) => {
  const { getText, i18nKeys } = useTranslation();
  let jobType = "";
  // Derive job type from tableType
  if (tableType === DQD_TABLE_TYPES.DATA_QUALITY_OVERVIEW || tableType === DQD_TABLE_TYPES.DATA_QUALITY_RESULTS) {
    jobType = "data-quality";
  } else if (tableType === DQD_TABLE_TYPES.DATA_CHARACTERIZATION) {
    jobType = "data-characterization";
  }

  const [refetchLatestFlowRun, setRefetchLatestFlowRun] = useState(0);
  const [latestFlowRun, loadingLatestFlowRun, errorLatestFlowRun] = useDatasetLatestFlowRun(
    jobType,
    datasetId,
    refetchLatestFlowRun,
    activeReleaseId
  );

  useEffect(() => {
    if (!latestFlowRun) {
      return;
    }
    //   Refetch latest flow run if flow run is still "in progress"
    const interval = setInterval(() => {
      setRefetchLatestFlowRun((refetch) => refetch + 1);
    }, 10000);

    // Clear interval if latest flow run is completed or "failed"
    if (latestFlowRun.state.type === "COMPLETED" || failedJobStates.includes(latestFlowRun.state.type)) {
      clearInterval(interval);
    }

    return (): void => clearInterval(interval);
  }, [latestFlowRun]);

  const renderDataQualityJobState = () => {
    // Flow has not completed succesfully
    if (failedJobStates.includes(latestFlowRun.state.type)) {
      return <>{getText(i18nKeys.DQD_JOB_RESULTS__LATEST_JOB_FAILED)}</>;
    }

    if (cancelledJobStates.includes(latestFlowRun.state.type)) {
      return <>{getText(i18nKeys.DQD_JOB_RESULTS__LATEST_JOB_CANCELLED)}</>;
    }

    if (inProgressJobStates.includes(latestFlowRun.state.type)) {
      if (jobType === "data-characterization") {
        return <Loader text={getText(i18nKeys.DQD_JOB_RESULTS__LOADER_1, [latestFlowRun.state.type])} />;
      }
      return <Loader text={getText(i18nKeys.DQD_JOB_RESULTS__LOADER_2, [latestFlowRun.state.type])} />;
    }

    if (latestFlowRun.state.type === FlowRunJobStateTypes.COMPLETED) {
      if (tableType === DQD_TABLE_TYPES.DATA_QUALITY_OVERVIEW) {
        return <RenderDataQualityOverviewTable flowRunId={latestFlowRun.id} datasetId={datasetId} />;
      } else if (tableType === DQD_TABLE_TYPES.DATA_QUALITY_RESULTS) {
        return (
          <RenderDataQualityResultsTable flowRunId={latestFlowRun.id} datasetName={datasetName} datasetId={datasetId} />
        );
      } else if (tableType === DQD_TABLE_TYPES.DATA_CHARACTERIZATION) {
        return <DataCharacterizationReports flowRunId={latestFlowRun.id} datasetId={datasetId} />;
      } else {
        return <>{getText(i18nKeys.DQD_JOB_RESULTS__INCORRECT_TABLETYPE)}</>;
      }
    }
  };

  return (
    <>
      {loadingLatestFlowRun ? (
        <Loader text={getText(i18nKeys.DQD_JOB_RESULTS__LOADER_3)} />
      ) : errorLatestFlowRun ? (
        <div>{errorLatestFlowRun.message}</div>
      ) : latestFlowRun ? (
        renderDataQualityJobState()
      ) : (
        <>{getText(i18nKeys.DQD_JOB_RESULTS__NO_JOB_FOUND)}</>
      )}
    </>
  );
};

interface RenderDataQualityOverviewTableProps {
  flowRunId: string;
  datasetId: string;
}

const RenderDataQualityOverviewTable: FC<RenderDataQualityOverviewTableProps> = ({ flowRunId, datasetId }) => {
  const { getText, i18nKeys } = useTranslation();
  const [dqdOverview, loadingDqdOverview, errorDqdOverview] = useDataQualityOverviewFromId(flowRunId, datasetId);

  return (
    <>
      {loadingDqdOverview ? (
        <Loader text={getText(i18nKeys.DQD_JOB_RESULTS__LOADER_4)} />
      ) : errorDqdOverview ? (
        <div>{getText(i18nKeys.DQD_JOB_RESULTS__ERROR_DQD_OVERVIEW, [errorDqdOverview.message])}</div>
      ) : (
        dqdOverview && <OverviewTable data={dqdOverview}></OverviewTable>
      )}
    </>
  );
};

interface RenderDataQualityResultsTableProps {
  flowRunId: string;
  datasetName: string;
  datasetId: string;
}

const RenderDataQualityResultsTable: FC<RenderDataQualityResultsTableProps> = ({
  flowRunId,
  datasetName,
  datasetId,
}) => {
  const { getText, i18nKeys } = useTranslation();
  const [dqdResults, loadingDqdResults, errorDqdResults] = useDataQualityResultsFromId(flowRunId, datasetId);
  const [dqdOverview] = useDataQualityOverviewFromId(flowRunId, datasetId);

  return (
    <>
      {loadingDqdResults ? (
        <Loader text={getText(i18nKeys.DQD_JOB_RESULTS__LOADER_5)} />
      ) : errorDqdResults ? (
        <div>{getText(i18nKeys.DQD_JOB_RESULTS__ERROR_DQD_RESULTS, [errorDqdResults.message])}</div>
      ) : (
        dqdResults && (
          <>
            <DownloadDataButtons data={dqdResults} overviewData={dqdOverview} datasetName={datasetName} />
            <DQDTable data={dqdResults}></DQDTable>
          </>
        )
      )}
    </>
  );
};
