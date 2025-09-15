import React, { FC, useEffect, useCallback } from "react";
import { Dialog } from "@portal/components";
import Divider from "@mui/material/Divider";
import { CloseDialogType } from "../../../../types";
import * as monaco from "monaco-editor";
import { loader, Editor } from "@monaco-editor/react";

import "./StudyTemplateDialog.scss";
interface StudyTemplateDialogProps {
  studyId: string;
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
}
const SafeEditor = Editor as any;
const StudyTemplateDialog: FC<StudyTemplateDialogProps> = ({ studyId, open, onClose }) => {
  loader.config({ monaco });

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
      <div className="study-template-dialog__content">
        {studyId}

        <SafeEditor height="90vh" defaultLanguage="javascript" defaultValue="// let's write some broken code 😈" />
      </div>
      <Divider />

      <div className="button-group-actions"></div>
    </Dialog>
  );
};

export default StudyTemplateDialog;
