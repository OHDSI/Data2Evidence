import React, { FC, useCallback, useState } from "react";
import Divider from "@mui/material/Divider";
import FormHelperText from "@mui/material/FormHelperText";
import { Button, Dialog, TextField } from "@portal/components";
import { api } from "../../../../axios/api";
import { NetworkStrategusStudy, Feedback, CloseDialogType } from "../../../../types";
import { i18nKeys } from "../../../../contexts/app-context/states";
import "./DeleteStrategusStudyDialog.scss";
import { useTranslation } from "../../../../contexts";

interface DeleteStrategusStudyDialogProps {
  study?: NetworkStrategusStudy;
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
}

const DeleteStrategusStudyDialog: FC<DeleteStrategusStudyDialogProps> = ({ study, open, onClose }) => {
  const { getText } = useTranslation();
  const [feedback, setFeedback] = useState<Feedback>({});
  const [deleting, setDeleting] = useState(false);
  const [inputData, setInputData] = useState("");
  const [inputError, setInputError] = useState(false);

  const handleClose = useCallback(
    (type: CloseDialogType) => {
      setFeedback({});
      setInputData("");
      setInputError(false);
      typeof onClose === "function" && onClose(type);
    },
    [onClose]
  );

  const isInputError = useCallback(() => {
    if (inputData !== (study?.studyId ?? "")) {
      setInputError(true);
      return true;
    }
    setInputError(false);
    return false;
  }, [inputData, study]);

  const handleDelete = useCallback(async () => {
    if (!study?.studyId) return;
    if (isInputError()) return;

    try {
      setDeleting(true);
      await api.strategusAnalysis.deleteStrategusAnalysis(study.studyId);
      handleClose("success");
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: getText(i18nKeys.DELETE_STRATEGUS_STUDY_DIALOG__ERROR, [study.studyId]),
        description: err?.data?.message || err?.message,
      });
      console.error(`[${study.studyId}] Error deleting strategus study:`, err);
    } finally {
      setDeleting(false);
    }
  }, [study, isInputError, handleClose, getText]);

  return (
    <Dialog
      className="delete-strategus-study-dialog"
      title={getText(i18nKeys.DELETE_STRATEGUS_STUDY_DIALOG__TITLE)}
      closable
      open={open}
      onClose={() => handleClose("cancelled")}
      feedback={feedback}
    >
      <Divider />
      <div className="delete-strategus-study-dialog__content">
        <div className="delete-strategus-study-dialog__content-text">
          <div>
            {getText(i18nKeys.DELETE_STRATEGUS_STUDY_DIALOG__CONFIRM)}: <strong>&quot;{study?.studyId}&quot;</strong>?
          </div>
          <div style={{ marginTop: "16px" }}>
            {getText(i18nKeys.DELETE_STRATEGUS_STUDY_DIALOG__CONFIRM_INSTRUCTION)}
          </div>
        </div>
        <div className="delete-strategus-study-dialog__content-input" style={{ marginTop: "24px" }}>
          <TextField
            fullWidth
            variant="standard"
            label={getText(i18nKeys.DELETE_STRATEGUS_STUDY_DIALOG__ENTER_STUDY_ID)}
            value={inputData}
            onChange={(event) => setInputData(event.target.value)}
            error={inputError}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleDelete();
              }
            }}
          />
          {inputError && (
            <FormHelperText error={true}>
              {getText(i18nKeys.DELETE_STRATEGUS_STUDY_DIALOG__ENTER_EXACT_STUDY_ID)}
            </FormHelperText>
          )}
        </div>
      </div>
      <Divider />
      <div className="button-group-actions">
        <Button
          text={getText(i18nKeys.DELETE_STRATEGUS_STUDY_DIALOG__CANCEL)}
          onClick={() => handleClose("cancelled")}
          variant="outlined"
          block
          disabled={deleting}
        />
        <Button
          text={getText(i18nKeys.DELETE_STRATEGUS_STUDY_DIALOG__YES_DELETE)}
          onClick={handleDelete}
          block
          loading={deleting}
        />
      </div>
    </Dialog>
  );
};

export default DeleteStrategusStudyDialog;
