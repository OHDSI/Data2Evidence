import React, { FC, useState, useCallback } from "react";
import Divider from "@mui/material/Divider";
import FormHelperText from "@mui/material/FormHelperText";
import { Dialog, Button, TextField } from "@portal/components";
import { Feedback } from "../../../../types";
import { api } from "../../../../axios/api";
import "./AddStrategusStudyDialog.scss";

interface AddStrategusStudyDialogProps {
  open: boolean;
  onClose: (success?: boolean) => void;
}

interface FormError {
  studyId: {
    required: boolean;
  };
  analysisSpec: {
    invalid: boolean;
  };
}

const EMPTY_FORM_ERROR: FormError = {
  studyId: { required: false },
  analysisSpec: { invalid: false },
};

const AddStrategusStudyDialog: FC<AddStrategusStudyDialogProps> = ({ open, onClose }) => {
  const [studyId, setStudyId] = useState("");
  const [analysisSpec, setAnalysisSpec] = useState("{}");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<FormError>(EMPTY_FORM_ERROR);
  const [feedback, setFeedback] = useState<Feedback>({});

  const handleClose = useCallback(() => {
    setStudyId("");
    setAnalysisSpec("{}");
    setFormError(EMPTY_FORM_ERROR);
    setFeedback({});
    onClose(false);
  }, [onClose]);

  const validateForm = useCallback(() => {
    let error: FormError = EMPTY_FORM_ERROR;
    let hasError = false;

    if (!studyId.trim()) {
      error = { ...error, studyId: { required: true } };
      hasError = true;
    }

    try {
      JSON.parse(analysisSpec);
    } catch (e) {
      error = { ...error, analysisSpec: { invalid: true } };
      hasError = true;
    }

    if (hasError) {
      setFormError(error);
      return false;
    }
    return true;
  }, [studyId, analysisSpec]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setFeedback({});
    setFormError(EMPTY_FORM_ERROR);

    try {
      await api.strategusAnalysis.createStrategusAnalysis({
        studyId: studyId.trim(),
        analysisSpec,
        mode: "notebook",
        notebookName: studyId.trim(),
      });

      setStudyId("");
      setAnalysisSpec("{}");
      onClose(true);
    } catch (err: any) {
      console.error("Error creating strategus study:", err);
      setFeedback({
        type: "error",
        message: err?.response?.data?.message || err?.message || "Failed to create study",
      });
    } finally {
      setLoading(false);
    }
  }, [studyId, analysisSpec, onClose, validateForm]);

  return (
    <Dialog
      className="add-strategus-study-dialog"
      title="Add Strategus Study"
      closable
      fullWidth
      maxWidth="md"
      open={open}
      onClose={handleClose}
      feedback={feedback}
    >
      <Divider />
      <div className="add-strategus-study-dialog__content">
        <div style={{ marginTop: "32px", fontWeight: "bold" }}>Study Information</div>
        <div style={{ marginBottom: "32px" }}>
          <TextField
            fullWidth
            variant="standard"
            label="Study ID"
            value={studyId}
            onChange={(event) => setStudyId(event.target.value)}
            error={formError.studyId.required}
            disabled={loading}
          />
          {formError.studyId.required && <FormHelperText error={true}>Study ID is required</FormHelperText>}
          <FormHelperText>Enter a unique identifier for your study</FormHelperText>
        </div>
        <div style={{ marginBottom: "32px" }}>
          <TextField
            fullWidth
            variant="standard"
            label="Analysis Specification (JSON)"
            multiline
            rows={4}
            value={analysisSpec}
            onChange={(event) => setAnalysisSpec(event.target.value)}
            error={formError.analysisSpec.invalid}
            disabled={loading}
          />
          {formError.analysisSpec.invalid && (
            <FormHelperText error={true}>Invalid JSON format for Analysis Specification</FormHelperText>
          )}
          <FormHelperText>Enter a valid JSON analysis specification</FormHelperText>
        </div>
      </div>
      <Divider />
      <div className="button-group-actions">
        <Button text="Cancel" onClick={handleClose} variant="outlined" block disabled={loading} />
        <Button text="Create Study" onClick={handleSubmit} block loading={loading} />
      </div>
    </Dialog>
  );
};

export default AddStrategusStudyDialog;

