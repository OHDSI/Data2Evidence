import React, { FC, useCallback, useState, useEffect } from "react";
import * as monaco from "monaco-editor";
import { loader, Editor } from "@monaco-editor/react";
import { Dialog, Button, Box, InputLabel, Select, MenuItem } from "@portal/components";
import Divider from "@mui/material/Divider";
import { useTranslation } from "../../../../contexts";
import { i18nKeys } from "../../../../contexts/app-context/states";
import { api } from "../../../../axios/api";
import { CloseDialogType, Feedback, StrategusStudy, StrategusStudyType } from "../../../../types";
import "./StudyTemplateDialog.scss";

interface StudyTemplateDialogProps {
  study: StrategusStudy;
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
  code: string;
  onCodeChange: (code: string) => void;
}
const SafeEditor = Editor as any;
const StudyTemplateDialog: FC<StudyTemplateDialogProps> = ({ study, open, onClose, code, onCodeChange }) => {
  const { getText } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>({});
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
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
      if (study.type === StrategusStudyType.LOCAL) {
        await api.strategusAnalysis.saveStategusAnalysisViewerCode(study.id, code);
      }
      setFeedback({
        type: "success",
        message: getText(i18nKeys.STUDY_TEMPLATE_DIALOG__SAVE_SUCCESS),
        autoClose: 6000,
      });
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: "error", message: getText(i18nKeys.STUDY_TEMPLATE_DIALOG__SAVE_ERROR, [study.id]) });
    } finally {
      setLoading(false);
    }
  }, [code, getText, study]);

  const getTemplates = useCallback(async () => {
    const templates = await api.strategusAnalysis.getStudyViewerTemplates();
    setTemplates(templates);
  }, []);

  useEffect(() => {
    getTemplates();
  }, [getTemplates]);

  return (
    <Dialog
      className="study-template-dialog"
      title={getText(i18nKeys.STUDY_TEMPLATE_DIALOG__TITLE, [study.id])}
      closable
      fullWidth
      maxWidth="md"
      open={open}
      onClose={() => handleClose("cancelled")}
      feedback={feedback}
    >
      <Divider />

      <div className="study-template-dialog__content">
        <Box mb={4}>
          <InputLabel sx={{ mb: 1 }}>Template</InputLabel>
          <Select
            sx={{ width: "100%" }}
            variant="standard"
            displayEmpty
            value={selectedTemplate}
            onChange={(event: any) => {
              const filename = (event?.target?.value as string) ?? "";
              setSelectedTemplate(filename);
              if (filename) {
                const tmpl = (templates as any[]).find((t: any) => t?.filename === filename);
                if (tmpl?.content) {
                  // TODO: editor should update with the template code
                  onCodeChange(tmpl.content);
                }
              }
            }}
          >
            <MenuItem value="">
              <em>Default</em>
            </MenuItem>
            {Array.isArray(templates) &&
              templates.map((template: any) => (
                <MenuItem key={template?.filename} value={template?.filename ?? ""}>
                  {template?.filename}
                </MenuItem>
              ))}
          </Select>
        </Box>

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
