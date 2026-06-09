import React, { FC, useCallback, useState } from "react";
import { Divider } from "@mui/material";
import { Button, Dialog } from "@portal/components";
import { api } from "../../../../axios/api";
import { useTranslation } from "../../../../contexts";
import { i18nKeys } from "../../../../contexts/app-context/states";
import { CloseDialogType, CreateCacheFlowRun, Feedback, Study } from "../../../../types";
import FlowRunNotificationDialog from "../FlowRunNotificationDialog/FlowRunNotificationDialog";
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
  const [triggeredFlowRunId, setTriggeredFlowRunId] = useState<string | null>(null);

  const handleClose = useCallback(
    (type: CloseDialogType) => {
      setFeedback({});
      setTriggeredFlowRunId(null);
      typeof onClose === "function" && onClose(type);
    },
    [onClose]
  );

  const handleSubmit = useCallback(async () => {
    setFeedback({});

    try {
      setUpdating(true);

      const studyFlowParameters = dataset?.flowParameters;
      const sourceDatasetId = dataset?.sourceStudyId;
      const targetDatasetId = sourceDatasetId ?? dataset?.id;
      const datasetType = dataset?.type?.toLowerCase();

      if (!targetDatasetId) {
        setFeedback({
          type: "error",
          message: getText(i18nKeys.CREATE_CACHE_DIALOG__MISSING_DATASET_ID),
        });
        setUpdating(false);
        return;
      }

      let result: { flowRunId: string };

      const data: CreateCacheFlowRun = { datasetId: targetDatasetId };

      // If this is a datamart (has a source), include the cache dataset ID
      if (sourceDatasetId) {
        data.cacheDatasetId = dataset?.id;
      }

      if (studyFlowParameters?.snapshotCopyConfig) {
        data.snapshotCopyConfig = studyFlowParameters.snapshotCopyConfig;
      }

      result = await api.dataflow.createCacheFlowRun(data);

      setTriggeredFlowRunId(result.flowRunId);
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.data?.message || err.data,
      });
      console.error("err", err.data);
    } finally {
      setUpdating(false);
    }
  }, [dataset, getText]);

  if (triggeredFlowRunId) {
    return (
      <FlowRunNotificationDialog
        title={getText(i18nKeys.CREATE_CACHE_DIALOG__FLOW_TRIGGERED_TITLE)}
        open={open}
        onClose={() => handleClose("success")}
        description={getText(i18nKeys.CREATE_CACHE_DIALOG__FLOW_TRIGGERED_DESCRIPTION, [
          String(dataset?.studyDetail?.name),
        ])}
        flowRunId={triggeredFlowRunId}
      />
    );
  }

  return (
    <Dialog
      className="create-cache-dialog"
      title={getText(i18nKeys.CREATE_CACHE_DIALOG__TITLE, [String(dataset?.studyDetail?.name)])}
      open={open}
      onClose={() => handleClose("cancelled")}
      feedback={feedback}
      closable
      fullWidth
      maxWidth="sm"
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
