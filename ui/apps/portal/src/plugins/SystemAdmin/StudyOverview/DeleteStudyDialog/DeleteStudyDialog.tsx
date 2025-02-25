import React, { FC, useCallback, useState } from "react";
import Divider from "@mui/material/Divider";
import { Button, Dialog } from "@portal/components";
import { api } from "../../../../axios/api";
import { Study, Feedback, CloseDialogType } from "../../../../types";
import "./DeleteStudyDialog.scss";
import { useTranslation } from "../../../../contexts";

interface DeleteStudyDialogProps {
  study?: Study;
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
}

const DeleteStudyDialog: FC<DeleteStudyDialogProps> = ({ study, open, onClose }) => {
  const { getText, i18nKeys } = useTranslation();
  const [feedback, setFeedback] = useState<Feedback>({});
  const [deleting, setDeleting] = useState(false);

  const handleClose = useCallback(
    (type: CloseDialogType) => {
      setFeedback({});
      typeof onClose === "function" && onClose(type);
    },
    [onClose, setFeedback]
  );

  const handleDelete = useCallback(async () => {
    if (study == null) return;

    try {
      setDeleting(true);
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
  }, [study, setFeedback, handleClose, getText]);

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
        <div>{getText(i18nKeys.DELETE_STUDY_DIALOG__CONFIRM)}:</div>
        <div>{study!.id} ?</div>
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
