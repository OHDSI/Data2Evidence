import React, { FC, useCallback, useState } from "react";
import Divider from "@mui/material/Divider";
import { useDatasets } from "../../../../hooks";
import { Button, Dialog, Loader, MenuItem, SelectChangeEvent, Select } from "@portal/components";
import { api } from "../../../../axios/api";
import { NetworkStrategusStudy, Feedback, CloseDialogType } from "../../../../types";
import { i18nKeys } from "../../../../contexts/app-context/states";
import "./CleanupStrategusStudyDialog.scss";
import { useTranslation } from "../../../../contexts";

interface CleanupStrategusStudyDialogProps {
  study?: NetworkStrategusStudy;
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
}

const CleanupStrategusStudyDialog: FC<CleanupStrategusStudyDialogProps> = ({ study, open, onClose }) => {
  const { getText } = useTranslation();
  const [feedback, setFeedback] = useState<Feedback>({});
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");
  const [isCleaningUp, setIsCleaningUp] = useState<boolean>(false);
  const [datasets, loadingDatasets, error] = useDatasets("systemAdmin");

  const handleDatasetChange = useCallback((event: SelectChangeEvent) => {
    setSelectedDatasetId(event.target.value);
  }, []);

  const handleClose = useCallback(
    (type: CloseDialogType) => {
      setFeedback({});
      typeof onClose === "function" && onClose(type);
    },
    [onClose, setFeedback]
  );

  const handleCleanupStudy = useCallback(async () => {
    if (isCleaningUp || !selectedDatasetId || !study?.studyId) {
      return;
    }

    setIsCleaningUp(true);

    try {
      await api.dataflow.createCleanUpStudySchemaRun(study.studyId, selectedDatasetId);

      setFeedback({
        type: "success",
        message: getText(i18nKeys.CLEANUP_STRATEGUS_STUDY_DIALOG__SUCCESS_STUDY_CLEANUP, [study.studyId]),
        autoClose: 5000,
      });
    } catch (error) {
      console.error(`[${study.id}] Error cleaning up study:`, error);
      setFeedback({
        type: "error",
        message: getText(i18nKeys.CLEANUP_STRATEGUS_STUDY_DIALOG__ERROR_CLEANUP_STUDY, [study.studyId]),
        autoClose: 5000,
      });
    } finally {
      setIsCleaningUp(false);
    }
  }, [selectedDatasetId, setFeedback, study]);

  if (loadingDatasets) return <Loader />;

  return (
    <Dialog
      className="cleanup-strategus-study-dialog"
      title={getText(i18nKeys.CLEANUP_STRATEGUS_STUDY_DIALOG__TITLE)}
      closable
      open={open}
      onClose={() => handleClose("cancelled")}
      feedback={feedback}
    >
      <Divider />
      <div className="cleanup-strategus-study-dialog__content">
        <div className="cleanup-strategus-study-dialog-selector">
          <label htmlFor="dataset-select" className="study-page__dataset-label">
            {getText(i18nKeys.CLEANUP_STRATEGUS_STUDY_DIALOG__SELECT_DATASET)}
          </label>
          <Select
            id="dataset-select"
            className="cleanup-strategus-study-dialog-select"
            variant="outlined"
            value={selectedDatasetId}
            onChange={handleDatasetChange}
            displayEmpty
            sx={{
              minWidth: "200px",
              "& .MuiSelect-select": {
                padding: "8px 14px",
              },
            }}
          >
            <MenuItem value="" disabled>
              {getText(i18nKeys.CLEANUP_STRATEGUS_STUDY_DIALOG__CHOOSE_DATASET)}
            </MenuItem>
            {datasets.map((dataset) => (
              <MenuItem key={dataset.id} value={dataset.id}>
                {dataset.studyDetail?.name || dataset.tokenStudyCode}
              </MenuItem>
            ))}
          </Select>
        </div>
      </div>
      <Divider />
      <div className="button-group-actions">
        <Button
          text={getText(i18nKeys.CLEANUP_STRATEGUS_STUDY_DIALOG__CANCEL)}
          onClick={() => handleClose("cancelled")}
          variant="outlined"
          block
        />
        <Button
          text={getText(i18nKeys.CLEANUP_STRATEGUS_STUDY_DIALOG__CLEANUP_STUDY)}
          onClick={handleCleanupStudy}
          block
          disabled={isCleaningUp || !selectedDatasetId || !study?.id}
        />
      </div>
    </Dialog>
  );
};

export default CleanupStrategusStudyDialog;
