import { Divider, TextField } from "@mui/material";
import { Box, Button, Dialog } from "@portal/components";
import React, { FC, useCallback, useState } from "react";
import { api } from "../../../../axios/api";
import { useTranslation } from "../../../../contexts";
import { i18nKeys } from "../../../../contexts/app-context/states";
import { CloseDialogType, CreateDcFlowRun, CreateDqdFlowRun, Feedback, Study } from "../../../../types";
import { JobRunTypes } from "../../DQD/types";
import "./AnalysisDialog.scss";

interface AnalysisDialogProps {
  study?: Study;
  runType: JobRunTypes;
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
}

interface FormData {
  comment: string;
}

const INITIAL_FORM_DATA: FormData = {
  comment: "",
};

const AnalysisDialog: FC<AnalysisDialogProps> = ({ study, runType, open, onClose }) => {
  const { getText } = useTranslation();
  const [feedback, setFeedback] = useState<Feedback>({});
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [updating, setUpdating] = useState(false);

  const handleClose = useCallback(
    (type: CloseDialogType) => {
      setFeedback({});
      typeof onClose === "function" && onClose(type);
    },
    [onClose, setFeedback]
  );

  const handleSubmit = useCallback(async () => {
    setFeedback({});

    try {
      setUpdating(true);

      if (runType === JobRunTypes.DQD) {
        const dqdRunData: CreateDqdFlowRun = {
          datasetId: study?.id,
          vocabSchemaName: study?.vocabSchemaName,
          releaseId: "",
          comment: formData.comment,
        };
        await api.dataflow.createDqdFlowRun(dqdRunData);
      } else if (runType === JobRunTypes.DataCharacterization) {
        const dcRunData: CreateDcFlowRun = {
          datasetId: study?.id,
          releaseId: "",
          comment: formData.comment,
          excludeAnalysisIds: "",
        };
        await api.dataflow.createDcFlowRun(dcRunData);
      }
      setFeedback({
        type: "success",
        message: getText(i18nKeys.ANALYSIS_DIALOG__RUN_SUCCESS, [String(runType), String(study?.id)]),
      });
      setTimeout(() => handleClose("success"), 6000);
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.data?.message || err.data,
      });
      console.error("err", err.data);
    } finally {
      setUpdating(false);
    }
  }, [formData, handleClose, study?.id, study?.vocabSchemaName, getText, runType]);

  const handleFormDataChange = useCallback((updates: { [field: string]: any }) => {
    setFormData((formData) => {
      const updated = { ...formData, ...updates };
      return updated;
    });
  }, []);

  const getRunName = useCallback(
    (runType: JobRunTypes) => {
      switch (runType) {
        case JobRunTypes.DQD:
          return getText(i18nKeys.ANALYSIS_DIALOG__DATA_QUALITY);
        case JobRunTypes.DataCharacterization:
          return getText(i18nKeys.ANALYSIS_DIALOG__DATA_CHARACTERIZATION);
      }
    },
    [getText]
  );

  return (
    <Dialog
      className="analysis-dialog"
      title={getText(i18nKeys.ANALYSIS_DIALOG__TITLE, [getRunName(runType), String(study?.id)])}
      open={open}
      onClose={() => handleClose("cancelled")}
      feedback={feedback}
      closable
      fullWidth
      maxWidth="md"
    >
      <Divider />

      <div className="analysis-dialog__content">
        <Box mt={4} mb={4} fontWeight="bold">
          {getText(i18nKeys.ANALYSIS_DIALOG__FORM_TITLE)}
        </Box>

        <Box mb={4}>
          <TextField
            fullWidth
            variant="standard"
            label="comment"
            value={formData.comment}
            onChange={(event) => handleFormDataChange({ comment: event.target.value })}
          />
        </Box>
      </div>

      <Divider />

      <div className="button-group-actions">
        <Button
          text={getText(i18nKeys.ANALYSIS_DIALOG__CANCEL)}
          onClick={() => handleClose("cancelled")}
          variant="outlined"
          block
          disabled={updating}
        />
        <Button text={getText(i18nKeys.ANALYSIS_DIALOG__RUN)} block loading={updating} onClick={handleSubmit} />
      </div>
    </Dialog>
  );
};

export default AnalysisDialog;
