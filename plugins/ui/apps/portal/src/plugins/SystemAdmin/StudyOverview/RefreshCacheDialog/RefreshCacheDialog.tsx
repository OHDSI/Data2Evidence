import React, { FC, useCallback, useState } from "react";
import { Divider } from "@mui/material";
import { Button, Dialog } from "@portal/components";
import { api } from "../../../../axios/api";
import { useTranslation } from "../../../../contexts";
import { i18nKeys } from "../../../../contexts/app-context/states";
import { CloseDialogType, Feedback, Study } from "../../../../types";
import "./RefreshCacheDialog.scss";

interface RefreshCacheDialogProps {
  dataset?: Study;
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
}

const RefreshCacheDialog: FC<RefreshCacheDialogProps> = ({ dataset, open, onClose }) => {
  const { getText } = useTranslation();
  const [feedback, setFeedback] = useState<Feedback>({});
  const [updating, setUpdating] = useState(false);

  const handleClose = useCallback(
    (type: CloseDialogType) => {
      setFeedback({});
      typeof onClose === "function" && onClose(type);
    },
    [onClose]
  );

  const handleSubmit = useCallback(async () => {
    setFeedback({});
    if (!dataset?.id) {
      setFeedback({ type: "error", message: getText(i18nKeys.REFRESH_CACHE_DIALOG__MISSING_DATASET_ID) });
      return;
    }
    try {
      setUpdating(true);
      await api.systemPortal.refreshWebApiCache(dataset.id);
      setFeedback({ type: "success", message: getText(i18nKeys.REFRESH_CACHE_DIALOG__STARTED) });
    } catch (err: any) {
      const message =
        err?.data?.message ||
        (typeof err === "string" ? err : err?.message) ||
        getText(i18nKeys.REFRESH_CACHE_DIALOG__ERROR);
      setFeedback({ type: "error", message });
      console.error("err", err);
    } finally {
      setUpdating(false);
    }
  }, [dataset, getText]);

  return (
    <Dialog
      className="refresh-cache-dialog"
      title={getText(i18nKeys.REFRESH_CACHE_DIALOG__TITLE, [String(dataset?.studyDetail?.name)])}
      open={open}
      onClose={() => handleClose("cancelled")}
      feedback={feedback}
      closable
      fullWidth
      maxWidth="sm"
    >
      <Divider />
      <div className="refresh-cache-dialog__content">
        {getText(i18nKeys.REFRESH_CACHE_DIALOG__DESCRIPTION, [String(dataset?.studyDetail?.name)])}
      </div>
      <div className="button-group-actions">
        <Button
          text={getText(i18nKeys.REFRESH_CACHE_DIALOG__CANCEL)}
          onClick={() => handleClose(feedback.type === "success" ? "success" : "cancelled")}
          variant="outlined"
          block
          disabled={updating}
        />
        <Button
          text={getText(i18nKeys.REFRESH_CACHE_DIALOG__CONFIRM)}
          block
          loading={updating}
          onClick={handleSubmit}
          disabled={feedback.type === "success"}
        />
      </div>
    </Dialog>
  );
};

export default RefreshCacheDialog;
