import React, { FC, useCallback } from "react";
import { Dialog } from "@portal/components";
import Divider from "@mui/material/Divider";
import { CloseDialogType } from "../../../../types";
import "./StudyTemplateDialog.scss";
interface StudyTemplateDialogProps {
  studyId: string;
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
}

const StudyTemplateDialog: FC<StudyTemplateDialogProps> = ({ studyId, open, onClose }) => {
  const handleClose = useCallback(
    (type: CloseDialogType) => {
      typeof onClose === "function" && onClose(type);
    },
    [onClose]
  );
  return (
    <Dialog
      className="study-template-dialog"
      title="Edit"
      closable
      fullWidth
      maxWidth="md"
      open={open}
      onClose={() => handleClose("cancelled")}
    >
      <Divider />
      <div className="study-template-dialog__content">{studyId}</div>
      <Divider />

      <div className="button-group-actions"></div>
    </Dialog>
  );
};

export default StudyTemplateDialog;
