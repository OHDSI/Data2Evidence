import React, { FC, useCallback, useState } from "react";
import Divider from "@mui/material/Divider";
import { useDatasets } from "../../../../hooks";
import { Button, Dialog, Loader, MenuItem, SelectChangeEvent, Select } from "@portal/components";
import { api } from "../../../../axios/api";
import { NetworkStrategusStudy, Feedback, CloseDialogType } from "../../../../types";
import { i18nKeys } from "../../../../contexts/app-context/states";
import "./RunStrategusStudyDialog.scss";
import { useTranslation } from "../../../../contexts";

interface RunStrategusStudyDialogProps {
  study?: NetworkStrategusStudy;
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
}

const RunStrategusStudyDialog: FC<RunStrategusStudyDialogProps> = ({ study, open, onClose }) => {
  const { getText } = useTranslation();
  const [feedback, setFeedback] = useState<Feedback>({});
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [datasets, loadingDatasets] = useDatasets("systemAdmin");

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

  const handleRunStudy = useCallback(async () => {
    if (isRunning || !selectedDatasetId || !study?.studyId) {
      return;
    }

    setIsRunning(true);

    try {
      const requestData = {
        json_graph: {
          analysisSpecification: study.analysisSpec,
        },
        options: {
          mode: "kernel",
          datasetId: selectedDatasetId,
          studyId: study.studyId,
          uploadResults: true,
        },
      };
      const response = await api.dataflow.createStudyAnalysisRun(requestData);

      setFeedback({
        type: "success",
        message: getText(i18nKeys.RUN_STRATEGUS_DIALOG__SUCCESS_STUDY_STARTED, [study.studyId]),
        description: getText(i18nKeys.RUN_STRATEGUS_DIALOG__SUCCESS_FLOW_RUN_ID, [
          response.flowrunId || response.flowRunId || "Unknown",
        ]),
        autoClose: 5000,
      });
    } catch (error) {
      console.error(`[${study.studyId}] Error running study:`, error);
      setFeedback({
        type: "error",
        message: getText(i18nKeys.RUN_STRATEGUS_DIALOG__ERROR_START_STUDY, [study.studyId]),
        autoClose: 5000,
      });
    } finally {
      setIsRunning(false);
    }
  }, [getText, isRunning, selectedDatasetId, setFeedback, study]);

  if (loadingDatasets) return <Loader />;

  return (
    <Dialog
      className="run-strategus-study-dialog"
      title={getText(i18nKeys.RUN_STRATEGUS_DIALOG__TITLE)}
      closable
      open={open}
      onClose={() => handleClose("cancelled")}
      feedback={feedback}
    >
      <Divider />
      <div className="run-strategus-study-dialog__content">
        <div className="run-strategus-study-dialog-selector">
          <label htmlFor="dataset-select" className="study-page__dataset-label">
            {getText(i18nKeys.RUN_STRATEGUS_DIALOG__SELECT_DATASET)}
          </label>
          <Select
            id="dataset-select"
            className="run-strategus-study-dialog-select"
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
              {getText(i18nKeys.RUN_STRATEGUS_DIALOG__CHOOSE_DATASET)}
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
          text={getText(i18nKeys.RUN_STRATEGUS_DIALOG__CANCEL)}
          onClick={() => handleClose("cancelled")}
          variant="outlined"
          block
        />
        <Button
          text={getText(i18nKeys.RUN_STRATEGUS_DIALOG__RUN_STUDY)}
          onClick={handleRunStudy}
          block
          disabled={isRunning || !selectedDatasetId || !study?.id}
        />
      </div>
    </Dialog>
  );
};

export default RunStrategusStudyDialog;
