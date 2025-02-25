import React, { FC, useCallback, useState } from "react";
import { Divider } from "@mui/material";
import { Button, Dialog } from "@portal/components";
import { api } from "../../../../axios/api";
import { useTranslation } from "../../../../contexts";
import { i18nKeys } from "../../../../contexts/app-context/states";
import { CloseDialogType, CreateCacheFlowRun, Feedback, Study } from "../../../../types";
import "./CreateCacheDialog.scss";

interface CreateCacheDialogProps {
  dataset?: Study;
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
}

const CreateCacheDialog: FC<CreateCacheDialogProps> = ({ dataset, open, onClose }) => {
  const { getText } = useTranslation();
  const [feedback, setFeedback] = useState<Feedback>({});
  const [updating, setUpdating] = useState(false);

  const handleClose = useCallback(
    (type: CloseDialogType) => {
      setFeedback({});
      typeof onClose === "function" && onClose(type);
    },
    [onClose, setFeedback]
  );

  const handleSubmit = useCallback(async () => {
    setFeedback({});

    try {
      setUpdating(true);

      const data: CreateCacheFlowRun = { datasetId: dataset?.id };
      await api.dataflow.createCacheFlowRun(data);

      setFeedback({
        type: "success",
        message: getText(i18nKeys.CREATE_CACHE_DIALOG__RUN_SUCCESS, [String(dataset?.id)]),
      });
      setTimeout(() => handleClose("success"), 6000);
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.data?.message || err.data,
      });
      console.error("err", err.data);
    } finally {
      setUpdating(false);
    }
  }, [handleClose, dataset?.id, getText]);

  return (
    <Dialog
      className="create-cache-dialog"
      title={getText(i18nKeys.CREATE_CACHE_DIALOG__TITLE, [String(dataset?.id)])}
      open={open}
      onClose={() => handleClose("cancelled")}
      feedback={feedback}
      closable
      fullWidth
      maxWidth="md"
    >
      <Divider />

      <div className="button-group-actions">
        <Button
          text={getText(i18nKeys.CREATE_CACHE_DIALOG__CANCEL)}
          onClick={() => handleClose("cancelled")}
          variant="outlined"
          block
          disabled={updating}
        />
        <Button text={getText(i18nKeys.CREATE_CACHE_DIALOG__RUN)} block loading={updating} onClick={handleSubmit} />
      </div>
    </Dialog>
  );
};

export default CreateCacheDialog;
