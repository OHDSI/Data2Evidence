import Divider from "@mui/material/Divider";
import TextField from "@mui/material/TextField";
import { Button, Dialog, Loader, MenuItem, Select, SelectChangeEvent } from "@portal/components";
import React, { FC, useCallback, useState } from "react";
import { api } from "../../../../axios/api";
import { useTranslation } from "../../../../contexts";
import { useDatasets } from "../../../../hooks";
import { CloseDialogType, Feedback, NetworkStrategusStudy } from "../../../../types";
import "./UploadStrategusResultsDialog.scss";

const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500MB
const BYTES_TO_MB = 1024 * 1024;

interface UploadStrategusResultsDialogProps {
  study?: NetworkStrategusStudy;
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
}

const UploadStrategusResultsDialog: FC<UploadStrategusResultsDialogProps> = ({ study, open, onClose }) => {
  const { getText, i18nKeys } = useTranslation();
  const [datasets, loadingDatasets] = useDatasets("systemAdmin");
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [analysisSpec, setAnalysisSpec] = useState("");
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>({});

  const handleDatasetChange = useCallback((event: SelectChangeEvent) => {
    setSelectedDatasetId(event.target.value);
  }, []);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0];
      if (selectedFile) {
        if (!selectedFile.name.endsWith(".zip")) {
          setFeedback({
            type: "error",
            message: getText(i18nKeys.STUDY_OVERVIEW__UPLOAD_STRATEGUS_ERROR_ZIP_ONLY),
            autoClose: 5000,
          });
          setFile(null);
          return;
        }
        if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
          setFeedback({
            type: "error",
            message: getText(i18nKeys.STUDY_OVERVIEW__UPLOAD_STRATEGUS_ERROR_SIZE),
            autoClose: 5000,
          });
          setFile(null);
          return;
        }
        setFile(selectedFile);
        setFeedback({});
      }
    },
    [getText, i18nKeys]
  );

  const handleAnalysisSpecChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setAnalysisSpec(event.target.value);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!file) {
      setFeedback({
        type: "error",
        message: getText(i18nKeys.STUDY_OVERVIEW__UPLOAD_STRATEGUS_ERROR_FILE),
        autoClose: 5000,
      });
      return;
    }

    if (!selectedDatasetId) {
      setFeedback({
        type: "error",
        message: getText(i18nKeys.STUDY_OVERVIEW__UPLOAD_STRATEGUS_ERROR_DATASET),
        autoClose: 5000,
      });
      return;
    }

    if (!analysisSpec.trim()) {
      setFeedback({
        type: "error",
        message: getText(i18nKeys.STUDY_OVERVIEW__UPLOAD_STRATEGUS_ERROR_SPEC),
        autoClose: 5000,
      });
      return;
    }

    if (!study) {
      setFeedback({
        type: "error",
        message: getText(i18nKeys.STUDY_OVERVIEW__UPLOAD_STRATEGUS_ERROR_STUDY),
        autoClose: 5000,
      });
      return;
    }

    const cleanedSpec = analysisSpec.trim();
    try {
      JSON.parse(cleanedSpec);
    } catch (e) {
      setFeedback({
        type: "error",
        message: getText(i18nKeys.STUDY_OVERVIEW__UPLOAD_STRATEGUS_ERROR_JSON),
        autoClose: 5000,
      });
      return;
    }

    // Find selected dataset to get databaseCode
    const selectedDataset = datasets.find((d) => d.id === selectedDatasetId);
    if (!selectedDataset) {
      setFeedback({
        type: "error",
        message: getText(i18nKeys.STUDY_OVERVIEW__UPLOAD_STRATEGUS_ERROR_DATASET_NOT_FOUND),
        autoClose: 5000,
      });
      return;
    }

    setUploading(true);
    setFeedback({});

    try {
      // Upload file to Supabase Storage
      const uploadResponse = await api.strategusResults.uploadStrategusResultsFile(study.studyId, file);

      console.log("Upload response:", uploadResponse);

      const flowResponse = await api.strategusResults.uploadResultsFromStorage(
        study.studyId,
        selectedDatasetId,
        analysisSpec || undefined
      );

      console.log("Flow triggered:", flowResponse);

      setFeedback({
        type: "success",
        message: getText(i18nKeys.STUDY_OVERVIEW__UPLOAD_STRATEGUS_SUCCESS, [
          flowResponse.flowrunId || flowResponse.flowRunId || "Started",
        ]),
        autoClose: 5000,
      });

      setTimeout(() => {
        handleClose("success");
      }, 1000);
    } catch (err: any) {
      console.error("Upload error:", err);
      setFeedback({
        type: "error",
        message:
          err.response?.data?.message || err.message || getText(i18nKeys.STUDY_OVERVIEW__UPLOAD_STRATEGUS_ERROR_UPLOAD),
        autoClose: 5000,
      });
    } finally {
      setUploading(false);
    }
  }, [file, analysisSpec, study, selectedDatasetId, datasets, getText, i18nKeys]);

  const handleClose = useCallback(
    (type: CloseDialogType) => {
      if (!uploading) {
        setFile(null);
        setAnalysisSpec("");
        setSelectedDatasetId("");
        setFeedback({});
        typeof onClose === "function" && onClose(type);
      }
    },
    [uploading, onClose]
  );

  if (!study) {
    return null;
  }

  if (loadingDatasets) return <Loader />;

  return (
    <Dialog
      className="upload-strategus-results-dialog"
      title={getText(i18nKeys.STUDY_OVERVIEW__UPLOAD_STRATEGUS_RESULTS_TITLE, [study.studyId])}
      closable
      open={open}
      onClose={() => handleClose("cancelled")}
      feedback={feedback}
    >
      <Divider />
      <div className="upload-strategus-results-dialog__content">
        {/* Dataset Selector - remove after construct 1-1 mapping for studyID and datasetID */}
        <div className="upload-strategus-results-dialog-field">
          <label htmlFor="dataset-select" className="upload-strategus-results-dialog-label">
            {getText(i18nKeys.STUDY_OVERVIEW__UPLOAD_STRATEGUS_SELECT_DATASET)}
          </label>
          <Select
            id="dataset-select"
            className="upload-strategus-results-dialog-select"
            variant="outlined"
            value={selectedDatasetId}
            onChange={handleDatasetChange}
            disabled={uploading}
            displayEmpty
            fullWidth
            sx={{
              minWidth: "200px",
              "& .MuiSelect-select": {
                padding: "8px 14px",
              },
            }}
          >
            <MenuItem value="" disabled>
              {getText(i18nKeys.STUDY_OVERVIEW__UPLOAD_STRATEGUS_CHOOSE_DATASET)}
            </MenuItem>
            {datasets.map((dataset) => (
              <MenuItem key={dataset.id} value={dataset.id}>
                {dataset.studyDetail?.name || dataset.tokenStudyCode || dataset.id}
              </MenuItem>
            ))}
          </Select>
        </div>

        {/* File Upload */}
        <div className="upload-strategus-results-dialog-field">
          <label htmlFor="file-input" className="upload-strategus-results-dialog-label">
            {getText(i18nKeys.STUDY_OVERVIEW__UPLOAD_STRATEGUS_SELECT_ZIP)}
          </label>
          <input
            id="file-input"
            type="file"
            accept=".zip"
            onChange={handleFileChange}
            disabled={uploading}
            className="upload-strategus-results-dialog-file-input"
          />
          {file && (
            <div className="upload-strategus-results-dialog-file-info">
              <span className="file-name">{file.name}</span>
              <span className="file-size">({(file.size / BYTES_TO_MB).toFixed(2)} MB)</span>
            </div>
          )}
        </div>

        {/* Analysis Specification */}
        <div className="upload-strategus-results-dialog-field">
          <label htmlFor="analysis-spec" className="upload-strategus-results-dialog-label">
            {getText(i18nKeys.STUDY_OVERVIEW__UPLOAD_STRATEGUS_ANALYSIS_SPEC)}
          </label>
          <TextField
            id="analysis-spec"
            multiline
            rows={10}
            fullWidth
            variant="outlined"
            value={analysisSpec}
            onChange={handleAnalysisSpecChange}
            disabled={uploading}
            placeholder='{"sharedResources": [], "moduleSpecifications": []}'
            sx={{
              fontFamily: "monospace",
              "& .MuiOutlinedInput-root": {
                fontFamily: "monospace",
                fontSize: "12px",
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#000080",
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#000080",
                },
              },
            }}
          />
          <div className="upload-strategus-results-dialog-hint">
            {getText(i18nKeys.STUDY_OVERVIEW__UPLOAD_STRATEGUS_ANALYSIS_SPEC_HINT)}
          </div>
        </div>
      </div>
      <Divider />
      <div className="button-group-actions">
        <Button
          text={getText(i18nKeys.STUDY_OVERVIEW__UPLOAD_STRATEGUS_CANCEL)}
          onClick={() => handleClose("cancelled")}
          variant="outlined"
          block
          disabled={uploading}
        />
        <Button
          text={
            uploading
              ? getText(i18nKeys.STUDY_OVERVIEW__UPLOAD_STRATEGUS_UPLOADING)
              : getText(i18nKeys.STUDY_OVERVIEW__UPLOAD_STRATEGUS_UPLOAD)
          }
          onClick={handleUpload}
          block
          disabled={uploading || !file || !selectedDatasetId || !analysisSpec.trim()}
        />
      </div>
    </Dialog>
  );
};

export default UploadStrategusResultsDialog;
