import React, { FC, useEffect, useCallback, useState } from "react";
import * as monaco from "monaco-editor";
import { loader, Editor } from "@monaco-editor/react";
import { Dialog, Button } from "@portal/components";
import Divider from "@mui/material/Divider";
import { api } from "../../../../axios/api";
import { CloseDialogType } from "../../../../types";

import "./StudyTemplateDialog.scss";
interface StudyTemplateDialogProps {
  studyId: string;
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
  code: string;
  onCodeChange: (code: string) => void;
}
const SafeEditor = Editor as any;
const StudyTemplateDialog: FC<StudyTemplateDialogProps> = ({ studyId, open, onClose, code, onCodeChange }) => {
  const [loading, setLoading] = useState(false);
  loader.config({ monaco });

  const handleClose = useCallback(
    (type: CloseDialogType) => {
      typeof onClose === "function" && onClose(type);
    },
    [onClose]
  );

  const handleSave = useCallback(async () => {
    try {
      setLoading(true);
      await api.strategusAnalysis.saveStategusAnalysisViewerCode(studyId, code);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [code]);

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

        <SafeEditor
          height="60vh"
          defaultLanguage="r"
          defaultValue={code}
          options={{
            scrollBeyondLastLine: false,
            fontSize: "14px",
          }}
          onChange={onCodeChange}
        />
      </div>
      <Divider />

      <div className="button-group-actions">
        <Button
          type="button"
          text="Cancel"
          onClick={() => handleClose("cancelled")}
          variant="outlined"
          block
          disabled={loading}
        />
        <Button type="submit" text="Save" block loading={loading} onClick={handleSave} />
      </div>
    </Dialog>
  );
};

export default StudyTemplateDialog;
