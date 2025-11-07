import { Button, Loader } from "@portal/components";
import { DQD_TABLE_TYPES, FlowRunJobStateTypes } from "./types";
import React, { FC, useState, useEffect } from "react";
import DatasetSelector from "./DatasetSelector/DatasetSelector";
import HistoryTable from "./History/HistoryTable";
import { Tabs, Tab } from "@mui/material";
import { mapTime } from "./Utils/Shared";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { useHistoryTableJobs } from "../../../hooks";
import { DQDJobResults } from "./DQDJobResults/DQDJobResults";
import JobRunButtons from "./JobRunButtons/JobRunButtons";
import { api } from "../../../axios/api";

import "./DQD.scss";
import { useTranslation } from "../../../contexts";

dayjs.extend(utc);
dayjs.extend(timezone);

const DQD: FC = () => {
  const { getText, i18nKeys } = useTranslation();
  const DataQualityDashboardTabs = {
    Overview: getText(i18nKeys.DQD__OVERVIEW),
    Detail: getText(i18nKeys.DQD__DETAIL),
    JobStatus: getText(i18nKeys.DQD__JOB_STATUS),
    DataCharacterization: getText(i18nKeys.DQD__DATA_CHARACTERIZATION),
  };
  const [selectedStudy, setSelectedStudy] = useState("");
  const [studyId, setStudyId] = useState("");
  const [tabValue, setTabValue] = useState(DataQualityDashboardTabs.JobStatus);
  const [refetchDqdJobs, setRefetchDqdJobs] = useState(0);
  const [isSilentRefresh, setIsSilentRefresh] = useState(false);
  const [dqdJobs, loadingDqdJobs, errorDqdJobs] = useHistoryTableJobs(refetchDqdJobs, isSilentRefresh);

  const handleStudySelect = (study: string, studyId: string) => {
    setSelectedStudy(study);
    setStudyId(studyId);
  };

  const handleTabSelectionChange = async (event: React.SyntheticEvent, value: string) => {
    setTabValue(value);
  };

  const handleRefreshJobStatus = () => {
    setIsSilentRefresh(false);
    setRefetchDqdJobs((refetch) => refetch + 1);
  };

  const handleGenerateJob = () => {
    handleRefreshJobStatus();
  };

  const handleCancelJobClick = async (id: string) => {
    await api.dataflow.cancelFlowRun(id);
    setIsSilentRefresh(true);
    setRefetchDqdJobs((refetch) => refetch + 1);
  };

  // Continously poll to check if there are any pending runs
  useEffect(() => {
    const silentRefreshDqdJobs = () => {
      setIsSilentRefresh(true);
      setRefetchDqdJobs((refetch) => refetch + 1);
    };
    const checkForPendingRuns = (): boolean => {
      // Check if there are any pending jobs in dqdJobs
      const pendingJobStatuses = [
        FlowRunJobStateTypes.SCHEDULED as string,
        FlowRunJobStateTypes.RUNNING as string,
        FlowRunJobStateTypes.PAUSED as string,
        FlowRunJobStateTypes.PENDING as string,
      ];
      if (dqdJobs) {
        const result = dqdJobs.filter((obj) => pendingJobStatuses.includes(obj.status));
        return result.length === 0 ? false : true;
      } else {
        return true;
      }
    };

    const interval = setInterval(() => {
      silentRefreshDqdJobs();
    }, 10000);

    const isRefetch = checkForPendingRuns();
    if (!isRefetch) {
      clearInterval(interval);
    }

    return (): void => clearInterval(interval);
  }, [dqdJobs]);

  const renderHistoryTable = () => {
    return (
      <>
        {loadingDqdJobs ? (
          <Loader text={getText(i18nKeys.DQD__LOADER)} />
        ) : errorDqdJobs ? (
          <div>{errorDqdJobs.message}</div>
        ) : (
          dqdJobs && (
            <>
              <Button onClick={handleRefreshJobStatus} text={getText(i18nKeys.DQD__REFRESH)} />
              <HistoryTable
                data={mapTime(dqdJobs)}
                handleStudySelect={handleStudySelect}
                handleCancelJobClick={handleCancelJobClick}
              />
            </>
          )
        )}
      </>
    );
  };

  return (
    <div className="dqd__container">
      {/* // TODO: remove isLoading in DatasetSelector */}
      <div className="selector__button">
        <DatasetSelector handleStudySelect={handleStudySelect} />
        <JobRunButtons datasetId={studyId} studyName={selectedStudy} handleGenerateJob={handleGenerateJob} />
        {/* // TODO: show last generated time */}
      </div>
      <div className="dqd_tab__container">
        <Tabs value={tabValue} onChange={handleTabSelectionChange} variant="fullWidth">
          <Tab label={DataQualityDashboardTabs.Overview} value={DataQualityDashboardTabs.Overview}></Tab>
          <Tab label={DataQualityDashboardTabs.Detail} value={DataQualityDashboardTabs.Detail}></Tab>
          <Tab label={DataQualityDashboardTabs.JobStatus} value={DataQualityDashboardTabs.JobStatus}></Tab>
          <Tab
            label={DataQualityDashboardTabs.DataCharacterization}
            value={DataQualityDashboardTabs.DataCharacterization}
          ></Tab>
        </Tabs>
      </div>
      <div>
        {tabValue === DataQualityDashboardTabs.JobStatus && renderHistoryTable()}

        {/* If study is not selected and tab value is not JobStatus, prompt user to select a study*/}
        {!selectedStudy && tabValue !== DataQualityDashboardTabs.JobStatus ? (
          <div className="info__section">
            <div>{getText(i18nKeys.DQD__SELECT, [tabValue])}</div>
          </div>
        ) : tabValue === DataQualityDashboardTabs.Overview ? (
          <DQDJobResults
            key={studyId}
            datasetId={studyId}
            datasetName={selectedStudy}
            tableType={DQD_TABLE_TYPES.DATA_QUALITY_OVERVIEW}
          />
        ) : tabValue === DataQualityDashboardTabs.Detail ? (
          <DQDJobResults
            key={studyId}
            datasetId={studyId}
            datasetName={selectedStudy}
            tableType={DQD_TABLE_TYPES.DATA_QUALITY_RESULTS}
          />
        ) : tabValue === DataQualityDashboardTabs.DataCharacterization ? (
          <DQDJobResults
            key={studyId}
            datasetId={studyId}
            datasetName={selectedStudy}
            tableType={DQD_TABLE_TYPES.DATA_CHARACTERIZATION}
          />
        ) : (
          <></>
        )}
      </div>
    </div>
  );
};

export default DQD;
