import React, { FC, useCallback, useState, useEffect } from "react";
import Divider from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress";
import { PlayCircleFilled, StopCircle } from "@mui/icons-material";
import { Button, Dialog, Select, MenuItem, InputLabel } from "@portal/components";
import * as monaco from "monaco-editor";
import { loader, Editor } from "@monaco-editor/react";
import { CloseDialogType, StudyDashboardTemplateData, Feedback, NetworkStrategusStudy } from "../../../../types";
import { useKernelViewer } from "../../../../hooks";
import { useTranslation } from "../../../../contexts";
import { api } from "../../../../axios/api";
import "./ManageStrategusResultViewerDialog.scss";
import { i18nKeys } from "../../../../contexts/app-context/states";

interface ManageStrategusResultViewerDialogProps {
  study: NetworkStrategusStudy;
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
}

const SafeEditor = Editor as any;

const ManageStrategusResultViewerDialog: FC<ManageStrategusResultViewerDialogProps> = ({ study, open, onClose }) => {
  console.log(study);
  loader.config({ monaco });
  const { getText } = useTranslation();
  const [viewerCode, setViewerCode] = useState<string>("");
  const [defaultviewerCode, setDefaultviewerCode] = useState<string>(study?.viewerCode || "");
  const [templates, setTemplates] = useState<StudyDashboardTemplateData[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("default");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>({});

  const [viewerStatus, startViewer, stopViewer] = useKernelViewer(study.studyId, study.studyId);

  const getTemplates = useCallback(async () => {
    const templates = await api.strategusAnalysis.getStudyViewerTemplates();
    setTemplates(templates);
  }, []);

  useEffect(() => {
    getTemplates();
    setViewerCode(defaultviewerCode);
  }, [getTemplates]);

  const handleStartViewer = useCallback(async () => {
    try {
      await startViewer(viewerCode);
    } catch (error) {
      console.error("Failed to start viewer:", error);
    }
  }, [startViewer, viewerCode]);

  const handleStopViewer = useCallback(async () => {
    try {
      await stopViewer();
    } catch (error) {
      console.error("Failed to stop viewer:", error);
    }
  }, [stopViewer]);

  const handleClose = useCallback(
    (type: CloseDialogType) => {
      setFeedback({});
      typeof onClose === "function" && onClose(type);
    },
    [onClose]
  );

  const handleSave = useCallback(async () => {
    setFeedback({});
    try {
      setLoading(true);
      await api.strategusAnalysis.saveStategusAnalysisViewerCode(study?.studyId, viewerCode);
      setFeedback({
        type: "success",
        message: getText(i18nKeys.MANAGE_STRATEGUS_RESULT_VIEWER_DIALOG__SAVE_SUCCESS),
      });
      setDefaultviewerCode(viewerCode);
      setSelectedTemplate("default");
    } catch (error) {
      console.error("Failed to save code:", error);
      setFeedback({
        type: "error",
        message: getText(i18nKeys.MANAGE_STRATEGUS_RESULT_VIEWER_DIALOG__SAVE_ERROR, [study.studyId]),
      });
    } finally {
      setLoading(false);
    }
  }, [viewerCode, study.studyId, getText]);

  const clearFeedback = useCallback(() => {
    setFeedback({});
  }, []);

  return (
    <Dialog
      className="manage-strategus-result-viewer-dialog"
      title={getText(i18nKeys.MANAGE_STRATEGUS_RESULT_VIEWER_DIALOG__TITLE, [study.studyId])}
      closable
      fullWidth
      maxWidth="lg"
      open={open}
      onClose={() => handleClose("cancelled")}
      feedback={feedback}
      onCloseFeedback={clearFeedback}
    >
      <Divider />

      <div className="manage-strategus-result-viewer-dialog__header">
        <div>
          <InputLabel sx={{ mb: 1 }}>Template</InputLabel>
          <Select
            sx={{ width: "100%" }}
            variant="standard"
            value={selectedTemplate}
            onChange={(event) => {
              const filename = event.target.value;
              setSelectedTemplate(filename);
              if (filename === "default") {
                setViewerCode(defaultviewerCode);
              } else {
                const tmpl = templates.find((t) => t.filename === filename);
                if (tmpl?.content) {
                  setViewerCode(tmpl.content);
                }
              }
            }}
          >
            <MenuItem value="default">
              <em>Default</em>
            </MenuItem>
            {templates.map((template) => (
              <MenuItem key={template.filename} value={template.filename}>
                {template?.filename}
              </MenuItem>
            ))}
          </Select>
        </div>
        <div className="manage-strategus-result-viewer-dialog__header__content">
          <Button
            onClick={handleStartViewer}
            startIcon={
              viewerStatus === "starting" ? (
                <CircularProgress size={16} className="study-card__action-icon study-card__loading-icon" />
              ) : (
                <PlayCircleFilled className="study-card__action-icon" />
              )
            }
            text={
              viewerStatus === "starting"
                ? getText(i18nKeys.MANAGE_STRATEGUS_RESULT_VIEWER_DIALOG__STARTING_VIEWER)
                : getText(i18nKeys.MANAGE_STRATEGUS_RESULT_VIEWER_DIALOG__START_VIEWER)
            }
            disabled={viewerStatus !== "down" && viewerStatus !== "failed"}
            variant="text"
          />

          <Button
            startIcon={
              viewerStatus === "stopping" ? (
                <CircularProgress size={16} className="study-card__action-icon study-card__loading-icon" />
              ) : (
                <StopCircle className="study-card__action-icon" />
              )
            }
            text={
              viewerStatus === "stopping"
                ? getText(i18nKeys.MANAGE_STRATEGUS_RESULT_VIEWER_DIALOG__STOPPING_VIEWER)
                : getText(i18nKeys.MANAGE_STRATEGUS_RESULT_VIEWER_DIALOG__STOP_VIEWER)
            }
            disabled={viewerStatus !== "up"}
            variant="text"
            onClick={handleStopViewer}
          />
        </div>
        <div className="manage-strategus-result-viewer-dialog__header__content">
          {getText(i18nKeys.MANAGE_STRATEGUS_RESULT_VIEWER_DIALOG__VIEWER_STATUS, [viewerStatus])}
        </div>
      </div>
      <Divider />

      <div className="manage-strategus-result-viewer-dialog__content">
        <SafeEditor
          height="70vh"
          language="r"
          value={viewerCode}
          options={{
            scrollBeyondLastLine: false,
            fontSize: "14px",
          }}
          onChange={setViewerCode}
        />
      </div>
      <Divider />

      <div className="button-group-actions">
        <Button
          text={getText(i18nKeys.MANAGE_STRATEGUS_RESULT_VIEWER_DIALOG__CANCEL)}
          onClick={() => handleClose("cancelled")}
          variant="outlined"
          block
        />
        <Button
          text={getText(i18nKeys.MANAGE_STRATEGUS_RESULT_VIEWER_DIALOG__SAVE)}
          onClick={handleSave}
          block
          loading={loading}
        />
      </div>
    </Dialog>
  );
};

export default ManageStrategusResultViewerDialog;
