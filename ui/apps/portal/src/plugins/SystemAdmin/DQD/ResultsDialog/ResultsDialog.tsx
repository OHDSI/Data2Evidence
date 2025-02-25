import React, { FC, useCallback } from "react";
import Divider from "@mui/material/Divider";
import { Dialog } from "@portal/components";
import { DQD_RUN_TYPES } from "../../../../components/DQD/types";
import { HistoryJob } from "../types";
import DataCharacterizationReports from "../../../../components/DQD/DataCharacterizationReports/DataCharacterizationReports";
import DQDCombinedResults from "../../../../components/DQD/DQDCombinedResults/DQDCombinedResults";
import "./ResultsDialog.scss";
import { useTranslation } from "../../../../contexts";

export interface ResultsDialogProps {
  job: HistoryJob;
  open: boolean;
  onClose?: () => void;
}

const ResultsDialog: FC<ResultsDialogProps> = ({ job, open, onClose }) => {
  const { getText, i18nKeys } = useTranslation();
  const handleClose = useCallback(() => {
    typeof onClose === "function" && onClose();
  }, [onClose]);

  return (
    <Dialog
      className="results-dialog"
      title={getText(i18nKeys.RESULTS_DIALOG__RESULTS, [job?.schemaName, job?.createdAt])}
      closable
      open={open}
      onClose={handleClose}
      maxWidth="xl"
    >
      <Divider />

      <div className="results-dialog__content">
        {job?.type.includes(DQD_RUN_TYPES.DATA_QUALITY) && job.datasetId && (
          <DQDCombinedResults flowRunId={job?.flowRunId} datasetId={job.datasetId} />
        )}
        {job?.type.includes(DQD_RUN_TYPES.DATA_CHARACTERIZATION) && job.datasetId && (
          <DataCharacterizationReports flowRunId={job?.flowRunId} datasetId={job.datasetId} />
        )}
      </div>
    </Dialog>
  );
};

export default ResultsDialog;
