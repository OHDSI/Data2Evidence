import React, { FC, useCallback, useState } from "react";
import Divider from "@mui/material/Divider";
import { Button, Dialog, Loader } from "@portal/components";
import { UsefulEvent } from "../../../../types";
import webComponentWrapper from "../../../../webcomponents/webComponentWrapper";
import { JobRunTypes } from "../types";
import { api } from "../../../../axios/api";
import { useDatasets } from "../../../../hooks";
import { useFeedback, useTranslation } from "../../../../contexts";
import ReleaseSelector from "../ReleaseSelector/ReleaseSelector";
import "./JobDialog.scss";

interface JobDialogProps {
  jobRunType: string;
  datasetId: string;
  cohortDefinitionId?: string;
  handleGenerateJob: () => void;
  open: boolean;
  onClose?: () => void;
}

const JobDialog: FC<JobDialogProps> = ({
  jobRunType,
  datasetId,
  cohortDefinitionId,
  handleGenerateJob,
  open,
  onClose,
}) => {
  const { getText, i18nKeys } = useTranslation();
  const studies = useDatasets("systemAdmin")[0];
  // Set title based on jobRunType
  const title =
    jobRunType === JobRunTypes.DQD
      ? getText(i18nKeys.JOB_DIALOG__GENERATE_DATA_QUALITY)
      : getText(i18nKeys.JOB_DIALOG__GENERATE_DATA_CHARACTERIZATION);
  const [isLoading, setIsLoading] = useState(false);
  const [releaseId, setReleaseId] = useState("");
  const [comment, setComment] = useState("");
  const { setFeedback } = useFeedback();

  const datasetDialect = studies.find((s) => s.id === datasetId)?.dialect;

  const runJob = async () => {
    setIsLoading(true);
    const vocabSchemaName = studies.find((s) => s.id === datasetId)?.vocabSchemaName || "";

    const data = { comment, datasetId, vocabSchemaName, releaseId, cohortDefinitionId };

    try {
      if (jobRunType === JobRunTypes.DQD) {
        await api.dataflow.createFlowRunByMetadata({
          type: JobRunTypes.DQD,
          options: data,
        });
      }
      if (jobRunType === JobRunTypes.DataCharacterization) {
        await api.dataflow.createFlowRunByMetadata({
          type: JobRunTypes.DataCharacterization,
          options: data,
        });
      }
      setFeedback({
        type: "success",
        message: getText(i18nKeys.JOB_DIALOG__SUCCESS, [jobRunType]),
        autoClose: 6000,
      });
      handleGenerateJob();
      setComment("");
      setReleaseId("");
    } catch {
      setFeedback({
        type: "error",
        message: getText(i18nKeys.JOB_DIALOG__ERROR, [jobRunType]),
        description: getText(i18nKeys.JOB_DIALOG__ERROR_DESCRIPTION),
        autoClose: 6000,
      });
    }
    setIsLoading(false);
    handleClose();
  };

  const handleClose = useCallback(() => {
    setReleaseId("");
    setComment("");
    typeof onClose === "function" && onClose();
  }, [onClose]);

  const handleReleaseSelect = (releaseId: string) => {
    setReleaseId(releaseId);
  };

  return (
    <Dialog className="job-dialog" title={title} closable open={open} onClose={handleClose} maxWidth="xl">
      <Divider />
      <div className="job-dialog__content">
        {datasetDialect === "hana" ? (
          <ReleaseSelector datasetId={datasetId} handleReleaseSelect={handleReleaseSelect} />
        ) : null}

        {/* @ts-ignore */}
        <d4l-input
          value={comment}
          label={getText(i18nKeys.JOB_DIALOG__COMMENT)}
          required
          // @ts-ignore
          ref={webComponentWrapper({
            handleInput: (event: UsefulEvent) => {
              setComment(event.target.value);
            },
          })}
        />

        <div className="job-dialog__button-groups">
          {isLoading ? (
            <Loader text={getText(i18nKeys.JOB_DIALOG__GENERATING_JOB)} />
          ) : (
            <>
              <Button text={getText(i18nKeys.JOB_DIALOG__GENERATE)} onClick={runJob} disabled={isLoading} />
              <Button text={getText(i18nKeys.JOB_DIALOG__CANCEL)} onClick={handleClose} variant="outlined" />
            </>
          )}
        </div>
      </div>
    </Dialog>
  );
};

export default JobDialog;
