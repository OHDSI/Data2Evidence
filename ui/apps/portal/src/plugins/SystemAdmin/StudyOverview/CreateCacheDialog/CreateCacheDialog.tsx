import React, { FC, useCallback, useState } from "react";
import { Divider } from "@mui/material";
import { Button, Dialog } from "@portal/components";
import { api } from "../../../../axios/api";
import { useTranslation } from "../../../../contexts";
import { i18nKeys } from "../../../../contexts/app-context/states";
import { CloseDialogType, CreateCacheFlowRun, CreateFhirCacheFlowRun, Feedback, Study } from "../../../../types";
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

      const studyFlowParameters = dataset?.flowParameters;
      const sourceDatasetId = dataset?.sourceStudyId;
      const targetDatasetId = sourceDatasetId ?? dataset?.id;
      const datasetType = dataset?.type?.toLowerCase();
      const isFhirCacheDataset = datasetType === "non_omop" && sourceDatasetId;

      if (!targetDatasetId) {
        setFeedback({
          type: "error",
          message: getText(i18nKeys.CREATE_CACHE_DIALOG__MISSING_DATASET_ID),
        });
        setUpdating(false);
        return;
      }

      if (isFhirCacheDataset) {
        try {
          const sourceDataset = await api.systemPortal.getDataset(sourceDatasetId);
          
          if (!sourceDataset?.databaseCode || !sourceDataset?.schemaName || !dataset?.schemaName) {
            setFeedback({
              type: "error",
              message: getText(i18nKeys.CREATE_CACHE_DIALOG__MISSING_FHIR_INFO),
            });
            setUpdating(false);
            return;
          }

          const fhirData: CreateFhirCacheFlowRun = {
            databaseCode: sourceDataset.databaseCode,
            schemaName: sourceDataset.schemaName,
            cacheSchemaName: dataset.schemaName,
            studyCode: sourceDataset.tokenStudyCode,
          };

          await api.dataflow.createFhirCacheFlowRun(fhirData);
        } catch (err: any) {
          setFeedback({
            type: "error",
            message: err.data?.message || err.data || getText(i18nKeys.CREATE_CACHE_DIALOG__FETCH_SOURCE_ERROR),
          });
          setUpdating(false);
          return;
        }
      } else {
        // Handle CDM datasets
        const data: CreateCacheFlowRun = { datasetId: targetDatasetId };

        // If this is a datamart (has a source), include the cache dataset ID
        if (sourceDatasetId) {
          data.cacheDatasetId = dataset?.id;
        }

        if (studyFlowParameters?.snapshotCopyConfig) {
          data.snapshotCopyConfig = studyFlowParameters.snapshotCopyConfig;
        }

        await api.dataflow.createCacheFlowRun(data);
      }

      setFeedback({
        type: "success",
        message: getText(i18nKeys.CREATE_CACHE_DIALOG__RUN_SUCCESS, [String(dataset?.studyDetail?.name)]),
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
  }, [handleClose, dataset, getText]);

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
