import React, { FC, useCallback, useState } from "react";
import { Divider } from "@mui/material";
import { Button, Dialog } from "@portal/components";
import { api } from "../../../../axios/api";
import { useTranslation, useFeedback } from "../../../../contexts";
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
  const { setFeedback } = useFeedback();
  const [dialogFeedback, setDialogFeedback] = useState<Feedback>({});
  const [updating, setUpdating] = useState(false);

  const datasetName = dataset?.studyDetail?.name || getText(i18nKeys.STUDY_OVERVIEW__UNTITLED);

  const handleClose = useCallback(
    (type: CloseDialogType) => {
      setDialogFeedback({});
      typeof onClose === "function" && onClose(type);
    },
    [onClose]
  );

  const handleSubmit = useCallback(async () => {
    setDialogFeedback({});
    if (!dataset?.id) {
      setDialogFeedback({ type: "error", message: getText(i18nKeys.REFRESH_CACHE_DIALOG__MISSING_DATASET_ID) });
      return;
    }
    try {
      setUpdating(true);
      await api.systemPortal.refreshWebApiCache(dataset.id);
      setFeedback({
        variant: "alert",
        type: "success",
        message: getText(i18nKeys.REFRESH_CACHE_DIALOG__STARTED),
        autoClose: 5000,
      });
      handleClose("success");
    } catch (err: any) {
      const message =
        err?.data?.message ||
        (typeof err === "string" ? err : err?.message) ||
        getText(i18nKeys.REFRESH_CACHE_DIALOG__ERROR);
      setDialogFeedback({ type: "error", message });
      console.error("err", err);
    } finally {
      setUpdating(false);
    }
  }, [dataset, getText, setFeedback, handleClose]);

  return (
    <Dialog
      className="refresh-cache-dialog"
      title={getText(i18nKeys.REFRESH_CACHE_DIALOG__TITLE, [datasetName])}
      open={open}
      onClose={() => handleClose("cancelled")}
      feedback={dialogFeedback}
      closable
      fullWidth
      maxWidth="sm"
    >
      <Divider />
      <div className="refresh-cache-dialog__content">
        {getText(i18nKeys.REFRESH_CACHE_DIALOG__DESCRIPTION, [datasetName])}
      </div>
      <div className="button-group-actions">
        <Button
          text={getText(i18nKeys.REFRESH_CACHE_DIALOG__CANCEL)}
          onClick={() => handleClose("cancelled")}
          variant="outlined"
          block
          disabled={updating}
        />
        <Button
          text={getText(i18nKeys.REFRESH_CACHE_DIALOG__CONFIRM)}
          block
          loading={updating}
          onClick={handleSubmit}
        />
      </div>
    </Dialog>
  );
};

export default RefreshCacheDialog;
