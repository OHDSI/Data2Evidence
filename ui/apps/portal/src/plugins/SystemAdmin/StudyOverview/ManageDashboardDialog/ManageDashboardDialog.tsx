import React, { FC, useCallback, useState } from "react";
import Divider from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress";
import { PlayCircleFilled, StopCircle } from "@mui/icons-material";
import { Button, Dialog, Select, MenuItem } from "@portal/components";
import * as monaco from "monaco-editor";
import { loader, Editor } from "@monaco-editor/react";
import { Study, CloseDialogType } from "../../../../types";
import { useKernelViewer } from "../../../../hooks";
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

  const [viewerStatus, startViewer, stopViewer] = useKernelViewer(study?.id!, study?.id!);

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
        {/* TODO: add git template support */}

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
