import React, { FC } from "react";
import { useNavigate } from "react-router-dom";
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

const FlowRunNotificationDialog: FC<FlowRunNotificationDialogProps> = ({
  title,
  open,
  onClose,
  description,
  flowRunId,
}) => {
  const navigate = useNavigate();

  return (
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
        {description}
        {flowRunId && <p>You can monitor its progress in the Jobs page.</p>}
      </div>
      <Divider />
      <div className="flow-run-notification-dialog__actions">
        <Button text="Close" onClick={onClose} variant="outlined" block />
        {flowRunId && (
          <Button
            text="View Flow Run"
            block
            onClick={() => navigate(`/systemadmin/jobs/runs/flow-run/${flowRunId}`)}
          />
        )}
      </div>
    </Dialog>
  );
};

export default FlowRunNotificationDialog;
