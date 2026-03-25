import React, { FC } from "react";
import { Divider } from "@mui/material";
import { Button, Dialog } from "@portal/components";
import "./FlowRunNotificationDialog.scss";

interface FlowRunNotificationDialogProps {
  title: string;
  open: boolean;
  onClose: () => void;
  description: React.ReactNode;
  flowRunId?: string | null;
}

const navigateToFlowRun = (flowRunId: string) => {
  window.location.href = `/d2e/portal/systemadmin/jobs/runs/flow-run/${flowRunId}`;
};

const FlowRunNotificationDialog: FC<FlowRunNotificationDialogProps> = ({
  title,
  open,
  onClose,
  description,
  flowRunId,
}) => (
  <Dialog
    className="flow-run-notification-dialog"
    title={title}
    open={open}
    onClose={onClose}
    closable
    fullWidth
    maxWidth="sm"
  >
    <Divider />
    <div className="flow-run-notification-dialog__content">
      <p>{description}</p>
      {flowRunId && <p>You can monitor its progress in the Jobs page.</p>}
    </div>
    <Divider />
    <div className="flow-run-notification-dialog__actions">
      <Button text="Close" onClick={onClose} variant="outlined" block />
      {flowRunId && (
        <Button text="View Flow Run" block onClick={() => navigateToFlowRun(flowRunId)} />
      )}
    </div>
  </Dialog>
);

export default FlowRunNotificationDialog;
