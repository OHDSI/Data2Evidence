import React, { FC, useCallback, useState } from "react";
import { Divider } from "@mui/material";
import { Button, Dialog } from "@portal/components";
import { api } from "../../../../axios/api";
import { useTranslation } from "../../../../contexts";
import { i18nKeys } from "../../../../contexts/app-context/states";
import { CloseDialogType, CreateCacheFlowRun, Feedback, Study } from "../../../../types";
import "./SetupSemanticSearchDialog.scss";

interface SetupSemanticSearchDialogProps {
  dataset?: Study;
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
}

const SetupSemanticSearchDialog: FC<SetupSemanticSearchDialogProps> = ({ dataset, open, onClose }) => {
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
      await api.dataflow.createSearchEmbeddingFlowRun(data);

      setFeedback({
        type: "success",
        message: getText(i18nKeys.CREATE_SEMANTIC_SEARCH_DIALOG__RUN_SUCCESS, [String(dataset?.studyDetail?.name)]),
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
      className="setup-semantic-search-dialog"
      title={getText(i18nKeys.CREATE_SEMANTIC_SEARCH_DIALOG__TITLE, [String(dataset?.studyDetail?.name)])}
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
          text={getText(i18nKeys.CREATE_SEMANTIC_SEARCH_DIALOG__CANCEL)}
          onClick={() => handleClose("cancelled")}
          variant="outlined"
          block
          disabled={updating}
        />
        <Button
          text={getText(i18nKeys.CREATE_SEMANTIC_SEARCH_DIALOG__RUN)}
          block
          loading={updating}
          onClick={handleSubmit}
        />
      </div>
    </Dialog>
  );
};

export default SetupSemanticSearchDialog;
