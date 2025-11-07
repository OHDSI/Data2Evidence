import React, { FC, useCallback, useState, useEffect } from "react";
import Divider from "@mui/material/Divider";
import { Dialog, Loader, Button, SubTitle } from "@portal/components";
import { CohortMapping } from "../../../../types";
import { useDataQualityDatasetLatestCohortFlowRun } from "../../../../hooks/dataflow/useDataQualityDatasetLatestCohortFlowRun";
import DQDCombinedResults from "../../../../components/DQD/DQDCombinedResults/DQDCombinedResults";
import JobDialog from "../../../SystemAdmin/DQD/JobDialog/JobDialog";
import {
  FlowRunJobStateTypes,
  FlowRunInProgressJobStateTypes,
  FlowRunCancelledJobTypes,
  FlowRunFailedJobTypes,
  JobRunTypes,
} from "../../../SystemAdmin/DQD/types";
import { useDialogHelper } from "../../../../hooks";
import { useFeedback, useTranslation, useUser } from "../../../../contexts";

import "./DataQualityDialog.scss";

interface DataQualityDialogProps {
  datasetId: string;
  cohort: CohortMapping;
  open: boolean;
  onClose?: () => void;
}

const DataQualityDialog: FC<DataQualityDialogProps> = ({ datasetId, cohort, open, onClose }) => {
  const { getText, i18nKeys } = useTranslation();
  const [refetchLatestFlowRun, setRefetchLatestFlowRun] = useState(0);
  const [latestFlowRun, loadingLatestFlowRun, errorLatestFlowRun] = useDataQualityDatasetLatestCohortFlowRun(
    datasetId,
    cohort.id,
    refetchLatestFlowRun
  );
  const [showJobDialog, openJobDialog, closeJobDialog] = useDialogHelper(false);
  const { getFeedback } = useFeedback();
  const feedback = getFeedback();
  const { user } = useUser();

  useEffect(() => {
    if (!latestFlowRun) {
      return;
    }
    //   Refetch latest flow run if flow run is still "in progress"
    const interval = setInterval(() => {
      setRefetchLatestFlowRun((refetch) => refetch + 1);
    }, 10000);

    // Clear interval if latest flow run is completed or "failed"
    if (latestFlowRun.state.type === "COMPLETED" || FlowRunFailedJobTypes.includes(latestFlowRun.state.type)) {
      clearInterval(interval);
    }

    return (): void => clearInterval(interval);
  }, [latestFlowRun]);

  const renderDataQualityJobState = () => {
    // Flow has not completed succesfully
    if (FlowRunFailedJobTypes.includes(latestFlowRun.state.type)) {
      return <SubTitle>{getText(i18nKeys.DATA_QUALITY_DIALOG__LATEST_JOB_FAILED)}</SubTitle>;
    }

    if (FlowRunCancelledJobTypes.includes(latestFlowRun.state.type)) {
      return <SubTitle>{getText(i18nKeys.DATA_QUALITY_DIALOG__LATEST_JOB_CANCELLED)}</SubTitle>;
    }

    if (FlowRunInProgressJobStateTypes.includes(latestFlowRun.state.type)) {
      return <Loader text={`${getText(i18nKeys.DATA_QUALITY_DIALOG__LATEST_JOB)} ${latestFlowRun.state.type}`} />;
    }

    if (FlowRunJobStateTypes.COMPLETED) {
      return <DQDCombinedResults flowRunId={latestFlowRun.id} datasetId={datasetId} />;
    }
  };

  const handleClose = useCallback(() => {
    typeof onClose === "function" && onClose();
  }, [onClose]);

  const handleGenerateJob = () => {
    setRefetchLatestFlowRun((refetch) => refetch + 1);
  };

  return (
    <Dialog
      className="results-dialog"
      title={`${getText(i18nKeys.DATA_QUALITY_DIALOG__RESULTS)}: ${cohort.name}`}
      closable
      open={open}
      onClose={handleClose}
      maxWidth="xl"
      feedback={feedback}
    >
      <Divider />
      <div className="results-dialog__content">
        <div className="results-dialog__button_container">
          <Button
            onClick={openJobDialog}
            text={getText(i18nKeys.DATA_QUALITY_DIALOG__RUN_DATA_QUALITY)}
            disabled={FlowRunInProgressJobStateTypes.includes(latestFlowRun?.state?.type) || !user.isSystemAdmin}
          />
        </div>

        <div className="results-dialog__table">
          {loadingLatestFlowRun ? (
            <Loader text={getText(i18nKeys.DATA_QUALITY_DIALOG__LOAD_LATEST_RUN)} />
          ) : errorLatestFlowRun ? (
            <div>{errorLatestFlowRun.message}</div>
          ) : latestFlowRun ? (
            renderDataQualityJobState()
          ) : (
            <SubTitle>{getText(i18nKeys.DATA_QUALITY_DIALOG__NO_JOB_FOUND)}</SubTitle>
          )}
        </div>
      </div>

      <JobDialog
        jobRunType={JobRunTypes.DQD}
        datasetId={datasetId}
        cohortDefinitionId={cohort.id.toString()}
        handleGenerateJob={handleGenerateJob}
        open={showJobDialog}
        onClose={closeJobDialog}
      />
    </Dialog>
  );
};

export default DataQualityDialog;
