import React, { FC, useCallback, useState } from "react";
import * as monaco from "monaco-editor";
import { loader, Editor } from "@monaco-editor/react";
import { Dialog, Button } from "@portal/components";
import Divider from "@mui/material/Divider";
import { useTranslation } from "../../../../contexts";
import { i18nKeys } from "../../../../contexts/app-context/states";
import { api } from "../../../../axios/api";
import { CloseDialogType, Feedback } from "../../../../types";
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
  const { getText } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>({});
  loader.config({ monaco });

  const handleClose = useCallback(
    (type: CloseDialogType) => {
      setFeedback({});
      typeof onClose === "function" && onClose(type);
    },
    [onClose, setFeedback]
  );

  const handleSave = useCallback(async () => {
    setFeedback({});
    try {
      setLoading(true);
      await api.strategusAnalysis.saveStategusAnalysisViewerCode(studyId, code);
      setFeedback({
        type: "success",
        message: getText(i18nKeys.STUDY_TEMPLATE_DIALOG__SAVE_SUCCESS),
        autoClose: 6000,
      });
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: "error", message: getText(i18nKeys.STUDY_TEMPLATE_DIALOG__SAVE_ERROR, [studyId]) });
    } finally {
      setLoading(false);
    }
  }, [code, getText, studyId]);

  return (
    <Dialog
      className="study-template-dialog"
      title={getText(i18nKeys.STUDY_TEMPLATE_DIALOG__TITLE, [studyId])}
      closable
      fullWidth
      maxWidth="md"
      open={open}
      onClose={() => handleClose("cancelled")}
      feedback={feedback}
    >
      <Divider />
      <div className="study-template-dialog__content">
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
          text={getText(i18nKeys.STUDY_TEMPLATE_DIALOG__CANCEL)}
          onClick={() => handleClose("cancelled")}
          variant="outlined"
          block
          disabled={loading}
        />
        <Button
          type="submit"
          text={getText(i18nKeys.STUDY_TEMPLATE_DIALOG__SAVE)}
          block
          loading={loading}
          onClick={handleSave}
        />
      </div>
    </Dialog>
  );
};

export default StudyTemplateDialog;
