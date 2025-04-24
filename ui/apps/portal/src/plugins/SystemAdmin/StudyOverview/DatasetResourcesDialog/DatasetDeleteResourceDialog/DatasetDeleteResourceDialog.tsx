import React, { FC, useCallback, useState } from "react";
import { CloseDialogType, DatasetResource, Feedback } from "../../../../../types";
import Divider from "@mui/material/Divider";
import { Button, Dialog } from "@portal/components";
import { api } from "../../../../../axios/api";
import "./DatasetDeleteResourceDialog.scss";
import { useTranslation } from "../../../../../contexts";

interface DatasetDeleteResourceDialogProps {
  datasetId: string;
  resource: DatasetResource;
  open: boolean;
  onClose?: (type: CloseDialogType, resourceId?: string) => void;
}

const DatasetDeleteResourceDialog: FC<DatasetDeleteResourceDialogProps> = ({ datasetId, resource, open, onClose }) => {
  const { getText, i18nKeys } = useTranslation();
  const [feedback, setFeedback] = useState<Feedback>({});
  const [loading, setLoading] = useState(false);

  const handleClose = useCallback(
    (type: CloseDialogType, filename?: string) => {
      setFeedback({});
      typeof onClose === "function" && onClose(type, filename);
    },
    [onClose, setFeedback]
  );

  const handleDelete = useCallback(async () => {
    if (!resource || !resource.name) return;

    setLoading(true);
    try {
      await api.systemPortal.deleteResource(datasetId, resource.name);
      handleClose("success", resource.name);
    } catch (error: any) {
      console.error(error);

      if (error.data?.message) {
        setFeedback({ type: "error", message: error.data.message });
      } else {
        setFeedback({
          type: "error",
          message: getText(i18nKeys.DATASET_DELETE_RESOURCE_DIALOG__ERROR),
          description: getText(i18nKeys.DATASET_DELETE_RESOURCE_DIALOG__ERROR_DESCRIPTION),
        });
      }
    } finally {
      setLoading(false);
    }
  }, [datasetId, resource, handleClose, getText]);

  return (
    <Dialog
      className="dataset-delete-resource-dialog"
      title={getText(i18nKeys.DATASET_DELETE_RESOURCE_DIALOG__DELETE_FILE)}
      closable
      open={open}
      onClose={() => handleClose("cancelled")}
      feedback={feedback}
    >
      <Divider />
      <div className="dataset-delete-resource-dialog__content">
        <div>{getText(i18nKeys.DATASET_DELETE_RESOURCE_DIALOG__CONFIRM)}:</div>
        <strong>&quot;{resource.name}&quot;</strong>
      </div>
      <Divider />
      <div className="button-group-actions">
        <Button
          text={getText(i18nKeys.CREATE_RELEASE_DIALOG__CANCEL)}
          onClick={() => handleClose("cancelled")}
          variant="outlined"
          block
          disabled={loading}
        />
        <Button
          text={getText(i18nKeys.DATASET_DELETE_RESOURCE_DIALOG__DELETE)}
          onClick={handleDelete}
          block
          loading={loading}
        />
      </div>
    </Dialog>
  );
};

export default DatasetDeleteResourceDialog;
