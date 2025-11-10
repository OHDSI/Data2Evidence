import React, { FC, useCallback, useState, useEffect } from "react";
import Divider from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress";
import { PlayCircleFilled, StopCircle } from "@mui/icons-material";
import { Button, Dialog, Select, MenuItem, InputLabel } from "@portal/components";
import * as monaco from "monaco-editor";
import { loader, Editor } from "@monaco-editor/react";
import { Study, CloseDialogType, StudyDashboardTemplateData, Feedback } from "../../../../types";
import { useKernelViewer } from "../../../../hooks";
import { useTranslation } from "../../../../contexts";
import { api } from "../../../../axios/api";
import "./ManageDashboardDialog.scss";
import { i18nKeys } from "../../../../contexts/app-context/states";

interface ManageDashboardDialogProps {
  study?: Study;
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
}

const SafeEditor = Editor as any;

const ManageDashboardDialog: FC<ManageDashboardDialogProps> = ({ study, open, onClose }) => {
  loader.config({ monaco });
  const { getText } = useTranslation();
  const [dashboardCode, setDashboardCode] = useState<string>("");
  const [defaultDashboardCode, setDefaultDashboardCode] = useState<string>("");
  const [templates, setTemplates] = useState<StudyDashboardTemplateData[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("default");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>({});

  const [viewerStatus, startViewer, stopViewer] = useKernelViewer(study?.id!, study?.id!);

  const getTemplates = useCallback(async () => {
    const templates = await api.systemPortal.getDashboardTemplatesFromRepo();
    setTemplates(templates);
  }, []);

  const getDefaultDashboardCode = useCallback(async () => {
    try {
      const defaultCode = await api.systemPortal.getDashboardCode(study?.id!, "dashboard");
      setDashboardCode(defaultCode.code);
      setDefaultDashboardCode(defaultCode.code);
    } catch (error) {
      console.error("Failed to fetch default dashboard code:", error);
      setDefaultDashboardCode("");
    }
  }, [study?.id]);

  useEffect(() => {
    getTemplates();
    getDefaultDashboardCode();
  }, [getTemplates, getDefaultDashboardCode]);

  const handleStartViewer = useCallback(async () => {
    try {
      await startViewer(dashboardCode);
    } catch (error) {
      console.error("Failed to start viewer:", error);
    }
  }, [startViewer, dashboardCode]);

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
      await api.systemPortal.upsertDashboardCode({
        datasetId: study?.id!,
        code: dashboardCode,
        type: "dashboard",
      });
      setFeedback({
        type: "success",
        message: getText(i18nKeys.MANAGE_DASHBOARD_DIALOG__SAVE_SUCCESS),
        autoClose: 6000,
      });
      setSelectedTemplate("default");
    } catch (error) {
      console.error("Failed to save dashboard code:", error);
      setFeedback({
        type: "error",
        message: getText(i18nKeys.MANAGE_DASHBOARD_DIALOG__SAVE_ERROR, [study?.id!]),
      });
    } finally {
      setLoading(false);
    }
  }, [dashboardCode, study?.id, getText]);

  return (
    <Dialog
      className="manage-dashboard-dialog"
      title={getText(i18nKeys.MANAGE_DASHBOARD_DIALOG__TITLE, [study?.id!])}
      closable
      fullWidth
      maxWidth="lg"
      open={open}
      onClose={() => handleClose("cancelled")}
      feedback={feedback}
    >
      <Divider />

      <div className="manage-dashboard-dialog__header">
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
                setDashboardCode(defaultDashboardCode);
              } else {
                const tmpl = templates.find((t) => t.filename === filename);
                if (tmpl?.content) {
                  setDashboardCode(tmpl.content);
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
        <div className="manage-dashboard-dialog__header__content">
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
                ? getText(i18nKeys.MANAGE_DASHBOARD_DIALOG__STARTING_VIEWER)
                : getText(i18nKeys.MANAGE_DASHBOARD_DIALOG__START_VIEWER)
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
                ? getText(i18nKeys.MANAGE_DASHBOARD_DIALOG__STOPPING_VIEWER)
                : getText(i18nKeys.MANAGE_DASHBOARD_DIALOG__STOP_VIEWER)
            }
            disabled={viewerStatus !== "up"}
            variant="text"
            onClick={handleStopViewer}
          />
        </div>
        <div className="manage-dashboard-dialog__header__content">
          {getText(i18nKeys.MANAGE_DASHBOARD_DIALOG__VIEWER_STATUS, [viewerStatus])}
        </div>
      </div>
      <Divider />

      <div className="manage-dashboard-dialog__content">
        <SafeEditor
          height="70vh"
          language="r"
          value={dashboardCode}
          options={{
            scrollBeyondLastLine: false,
            fontSize: "14px",
          }}
          onChange={setDashboardCode}
        />
      </div>
      <Divider />

      <div className="button-group-actions">
        <Button
          text={getText(i18nKeys.MANAGE_DASHBOARD_DIALOG__CANCEL)}
          onClick={() => handleClose("cancelled")}
          variant="outlined"
          block
        />
        <Button text={getText(i18nKeys.MANAGE_DASHBOARD_DIALOG__SAVE)} onClick={handleSave} block loading={loading} />
      </div>
    </Dialog>
  );
};

export default ManageDashboardDialog;
