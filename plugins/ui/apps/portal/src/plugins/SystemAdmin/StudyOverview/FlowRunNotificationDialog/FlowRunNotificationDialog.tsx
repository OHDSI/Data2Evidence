import React, { FC } from "react";
import { useNavigate } from "react-router-dom";
import { Divider } from "@mui/material";
import { Button, Dialog } from "@portal/components";
import { useTranslation } from "../../../../contexts";
import { i18nKeys } from "../../../../contexts/app-context/states";
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
  const { getText } = useTranslation();

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
        {flowRunId && <p>{getText(i18nKeys.FLOW_RUN_NOTIFICATION_DIALOG__PROGRESS_MESSAGE)}</p>}
      </div>
      <Divider />
      <div className="flow-run-notification-dialog__actions">
        <Button text={getText(i18nKeys.FLOW_RUN_NOTIFICATION_DIALOG__CLOSE)} onClick={onClose} variant="outlined" block />
        {flowRunId && (
          <Button
            text={getText(i18nKeys.FLOW_RUN_NOTIFICATION_DIALOG__VIEW_FLOW_RUN)}
            block
            onClick={() => navigate(`/systemadmin/jobs/runs/flow-run/${flowRunId}`)}
          />
        )}
      </div>
    </Dialog>
  );
};

export default FlowRunNotificationDialog;
