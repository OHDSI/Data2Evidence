import React, { FC, useState, useEffect, useCallback } from "react";
import { Button, Tooltip } from "@portal/components";
import { useDialogHelper } from "../../../../hooks";
import JobDialog from "../JobDialog/JobDialog";
import { JobRunTypes } from "../types";
import "./JobRunButtons.scss";
import { api } from "../../../../axios/api";
import { MetaData } from "../../../../types";
import { useTranslation } from "../../../../contexts";

interface JobRunButtonsProps {
  datasetId: string;
  studyName: string;
  handleGenerateJob: () => void;
}

const JobRunButtons: FC<JobRunButtonsProps> = ({ datasetId, studyName, handleGenerateJob }) => {
  const { getText, i18nKeys } = useTranslation();
  const [showJobDialog, openJobDialog, closeJobDialog] = useDialogHelper(false);
  const [jobRunType, setJobRunType] = useState<JobRunTypes | null>(null);
  const [flowMetadata, setFlowMetadata] = useState<MetaData[]>([]);

  const getFlowMetadata = useCallback(async () => {
    try {
      const flowMetadata = await api.dataflow.getFlowMetadata();
      setFlowMetadata(flowMetadata);
    } catch (error) {
      console.error(error);
    }
  }, []);

  const handleRunDQDClick = () => {
    setJobRunType(JobRunTypes.DQD);
    openJobDialog();
  };
  const handleRunDataCharacterizationClick = () => {
    setJobRunType(JobRunTypes.DataCharacterization);
    openJobDialog();
  };

  const isButtonDisabled = useCallback(
    (type?: string) => {
      if (type && studyName) {
        return !flowMetadata.some((flow) => flow.type === type);
      }
      return !studyName;
    },
    [studyName, flowMetadata]
  );

  const getTooltipText = useCallback(() => {
    if (isButtonDisabled(JobRunTypes.DQD) && studyName) {
      return getText(i18nKeys.JOB_RUN_BUTTONS__NO_DATA_QUALITY_JOB_TOOLTIP);
    }
    return "";
  }, [studyName]);

  useEffect(() => {
    getFlowMetadata();
  }, [getFlowMetadata]);

  return (
    <>
      <div className="selector__button">
        <Tooltip title={getTooltipText()}>
          <span>
            <Button
              onClick={handleRunDQDClick}
              text={getText(i18nKeys.JOB_RUN_BUTTONS__RUN_DATA_QUALITY)}
              disabled={isButtonDisabled(JobRunTypes.DQD)}
            />
          </span>
        </Tooltip>
        <Button
          onClick={handleRunDataCharacterizationClick}
          text={getText(i18nKeys.JOB_RUN_BUTTONS__RUN_DATA_CHARACTERIZATION)}
          disabled={isButtonDisabled(JobRunTypes.DataCharacterization)}
        />
      </div>
      {jobRunType && (
        <JobDialog
          jobRunType={jobRunType}
          datasetId={datasetId}
          handleGenerateJob={handleGenerateJob}
          open={showJobDialog}
          onClose={closeJobDialog}
        />
      )}
    </>
  );
};

export default JobRunButtons;
