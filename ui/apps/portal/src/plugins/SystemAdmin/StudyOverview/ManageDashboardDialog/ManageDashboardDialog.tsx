import React, { FC, useCallback, useState, useEffect } from "react";
import Divider from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress";
import { PlayCircleFilled, StopCircle } from "@mui/icons-material";
import { Button, Dialog, Select, MenuItem, InputLabel } from "@portal/components";
import * as monaco from "monaco-editor";
import { loader, Editor } from "@monaco-editor/react";
import { Study, CloseDialogType, StudyDashboardTemplateData } from "../../../../types";
import { useKernelViewer } from "../../../../hooks";
import { api } from "../../../../axios/api";
import "./ManageDashboardDialog.scss";

interface ManageDashboardDialogProps {
  study?: Study;
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
}

const SafeEditor = Editor as any;

const ManageDashboardDialog: FC<ManageDashboardDialogProps> = ({ study, open, onClose }) => {
  loader.config({ monaco });
  const [dashboardCode, setDashboardCode] = useState<string>("print('Hello, World!')");
  const [templates, setTemplates] = useState<StudyDashboardTemplateData[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("default");

  const [viewerStatus, startViewer, stopViewer] = useKernelViewer(study?.id!, study?.id!);

  const getTemplates = useCallback(async () => {
    const templates = await api.systemPortal.getDashboardTemplatesFromRepo();
    setTemplates(templates);
  }, []);

  useEffect(() => {
    getTemplates();
  }, [getTemplates]);

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
      typeof onClose === "function" && onClose(type);
    },
    [onClose]
  );

  return (
    <Dialog
      className="manage-dashboard-dialog"
      title={"Manage Dashboard"}
      closable
      fullWidth
      maxWidth="lg"
      open={open}
      onClose={() => handleClose("cancelled")}
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
                setDashboardCode("print('Hello, World!')");
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
              viewerStatus == "starting" ? (
                <CircularProgress size={16} className="study-card__action-icon study-card__loading-icon" />
              ) : (
                <PlayCircleFilled className="study-card__action-icon" />
              )
            }
            text={viewerStatus == "starting" ? "Starting Viewer..." : "Start Viewer"}
            disabled={viewerStatus !== "down" && viewerStatus !== "failed"}
            variant="text"
          />

          <Button
            startIcon={
              viewerStatus == "stopping" ? (
                <CircularProgress size={16} className="study-card__action-icon study-card__loading-icon" />
              ) : (
                <StopCircle className="study-card__action-icon" />
              )
            }
            text={viewerStatus == "stopping" ? "Stopping Viewer..." : "Stop Viewer"}
            disabled={viewerStatus !== "up"}
            variant="text"
            onClick={handleStopViewer}
          />
        </div>
        <div className="manage-dashboard-dialog__header__content">Viewer Status: {viewerStatus}</div>
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
        <Button text="Cancel" onClick={() => handleClose("cancelled")} variant="outlined" block />
        <Button text="Save" block />
      </div>
    </Dialog>
  );
};

export default ManageDashboardDialog;
