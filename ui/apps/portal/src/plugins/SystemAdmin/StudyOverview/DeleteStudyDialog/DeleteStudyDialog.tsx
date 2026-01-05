import React, { FC, useCallback, useState } from "react";
import Divider from "@mui/material/Divider";
import FormHelperText from "@mui/material/FormHelperText";
import { Button, Dialog, TextField } from "@portal/components";
import { api } from "../../../../axios/api";
import { Study, Feedback, CloseDialogType } from "../../../../types";
import "./DeleteStudyDialog.scss";
import { useTranslation } from "../../../../contexts";

interface DeleteStudyDialogProps {
  study?: Study & { children?: Study[] };
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
}

const DeleteStudyDialog: FC<DeleteStudyDialogProps> = ({ study, open, onClose }) => {
  const { getText, i18nKeys } = useTranslation();
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
    [onClose, setFeedback]
  );

  const isInputError = useCallback(() => {
    const datasetName = study?.studyDetail?.name || "";
    if (inputData !== datasetName) {
      setInputError(true);
      return true;
    } else {
      setInputError(false);
      return false;
    }
  }, [inputData, study]);

  const handleDelete = useCallback(async () => {
    if (study == null) return;
    if (isInputError()) return;

    try {
      setDeleting(true);
      
      // Delete all children datasets first
      if (study.children && study.children.length > 0) {
        for (const child of study.children) {
          try {
            if (child.fhir_project_id != null) {
              await api.gateway.deleteFhirStaging(child.fhir_project_id);
            }
            await api.systemPortal.deleteDataset(child.id);
          } catch (err: any) {
            console.error(`Error when deleting child dataset ${child.id}`, err);
          }
        }
      }
      
      // Delete the parent dataset
      if (study.fhir_project_id != null) await api.gateway.deleteFhirStaging(study.fhir_project_id);
      await api.systemPortal.deleteDataset(study.id);
      handleClose("success");
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: getText(i18nKeys.DELETE_STUDY_DIALOG__ERROR, [study.id]),
        description: err.data?.message || err.data,
      });
      console.error("Error when deleting dataset", err);
    } finally {
      setDeleting(false);
    }
  }, [study, isInputError, setFeedback, handleClose, getText]);

  const childrenCount = study?.children?.length || 0;
  const hasChildren = childrenCount > 0;

  return (
    <Dialog
      className="delete-study-dialog"
      title={getText(i18nKeys.DELETE_STUDY_DIALOG__DELETE_DATASET)}
      closable
      open={open}
      onClose={() => handleClose("cancelled")}
      feedback={feedback}
    >
      <Divider />
      <div className="delete-study-dialog__content">
        <div className="delete-study-dialog__content-text">
          <div>
            {getText(i18nKeys.DELETE_STUDY_DIALOG__CONFIRM)}: <strong>&quot;{study?.studyDetail?.name || study?.id}&quot;</strong>?
          </div>
          {hasChildren && (
            <div style={{ marginTop: "16px", fontWeight: "bold" }}>
              {getText(i18nKeys.DELETE_STUDY_DIALOG__WARNING_CHILDREN, [
                String(childrenCount),
                childrenCount > 1 ? "s" : ""
              ])}
            </div>
          )}
          <div style={{ marginTop: "16px" }}>
            {getText(i18nKeys.DELETE_STUDY_DIALOG__CONFIRM_INSTRUCTION)}
          </div>
        </div>
        <div className="delete-study-dialog__content-input" style={{ marginTop: "24px" }}>
          <TextField
            fullWidth
            variant="standard"
            label={getText(i18nKeys.DELETE_STUDY_DIALOG__ENTER_DATASET_NAME)}
            value={inputData}
            onChange={(event) => setInputData(event.target.value)}
            error={inputError}
          />
          {inputError && (
            <FormHelperText error={true}>
              {getText(i18nKeys.DELETE_STUDY_DIALOG__ENTER_EXACT_DATASET_NAME)}
            </FormHelperText>
          )}
        </div>
      </div>
      <Divider />
      <div className="button-group-actions">
        <Button
          text={getText(i18nKeys.DELETE_STUDY_DIALOG__CANCEL)}
          onClick={() => handleClose("cancelled")}
          variant="outlined"
          block
          disabled={deleting}
        />
        <Button
          text={getText(i18nKeys.DELETE_STUDY_DIALOG__YES_DELETE)}
          onClick={handleDelete}
          block
          loading={deleting}
        />
      </div>
    </Dialog>
  );
};

export default DeleteStudyDialog;
