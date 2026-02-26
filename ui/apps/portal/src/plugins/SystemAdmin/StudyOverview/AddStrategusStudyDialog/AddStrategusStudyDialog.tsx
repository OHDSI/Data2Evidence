import React, { FC, useState, useCallback } from "react";
import Divider from "@mui/material/Divider";
import FormHelperText from "@mui/material/FormHelperText";
import { Dialog, Button, TextField } from "@portal/components";
import { Feedback } from "../../../../types";
import { api } from "../../../../axios/api";
import { useTenant } from "../../../../hooks";
import "./AddStrategusStudyDialog.scss";

interface AddStrategusStudyDialogProps {
  open: boolean;
  onClose: (success?: boolean) => void;
}

interface FormError {
  studyName: {
    required: boolean;
    invalid: boolean;
  };
  tokenStudyCode: {
    required: boolean;
    valid: boolean;
  };
  analysisSpec: {
    invalid: boolean;
  };
}

const EMPTY_FORM_ERROR: FormError = {
  studyName: { required: false, invalid: false },
  tokenStudyCode: { required: false, valid: false },
  analysisSpec: { invalid: false },
};

const AddStrategusStudyDialog: FC<AddStrategusStudyDialogProps> = ({ open, onClose }) => {
  const [tenant] = useTenant();
  const [studyName, setStudyName] = useState("");
  const [tokenStudyCode, setTokenStudyCode] = useState("");
  const [analysisSpec, setAnalysisSpec] = useState("{}");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<FormError>(EMPTY_FORM_ERROR);
  const [feedback, setFeedback] = useState<Feedback>({});

  const handleClose = useCallback(() => {
    setStudyName("");
    setTokenStudyCode("");
    setAnalysisSpec("{}");
    setFormError(EMPTY_FORM_ERROR);
    setFeedback({});
    onClose(false);
  }, [onClose]);

  const tokenIsValid = useCallback((token: string) => {
    const tokenFormat = /^[a-zA-Z0-9_]{1,80}$/;
    if (token.match(tokenFormat)) {
      return true;
    }
  }, []);

  const validateForm = useCallback(() => {
    let error: FormError = EMPTY_FORM_ERROR;
    let hasError = false;

    if (!studyName.trim()) {
      error = { ...error, studyName: { required: true, invalid: false } };
      hasError = true;
    }

    const studyNamePattern = /^[a-zA-Z0-9_-]+$/;
    if (studyName && !studyNamePattern.test(studyName)) {
      error = { ...error, studyName: { required: false, invalid: true } };
      hasError = true;
    }

    if (!tokenStudyCode) {
      error = { ...error, tokenStudyCode: { required: true, valid: false } };
      hasError = true;
    }

    if (tokenStudyCode && !tokenIsValid(tokenStudyCode)) {
      error = { ...error, tokenStudyCode: { required: false, valid: true } };
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
  }, [studyName, tokenStudyCode, analysisSpec, tokenIsValid]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setFeedback({});
    setFormError(EMPTY_FORM_ERROR);

    try {
      await api.strategusAnalysis.createStrategusAnalysis({
        studyId: studyName.trim(),
        tokenStudyCode: tokenStudyCode.trim(),
        analysisSpec,
        mode: "notebook",
        notebookName: studyName.trim(),
        tenantId: tenant?.id || "",
      });

      setStudyName("");
      setTokenStudyCode("");
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
  }, [studyName, tokenStudyCode, analysisSpec, tenant, onClose, validateForm]);

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
            label="Study Name"
            value={studyName}
            onChange={(event) => setStudyName(event.target.value)}
            error={formError.studyName.required || formError.studyName.invalid}
            disabled={loading}
          />
          {formError.studyName.required && <FormHelperText error={true}>Study Name is required</FormHelperText>}
          {formError.studyName.invalid && (
            <FormHelperText error={true}>
              Study Name can only contain letters, numbers, underscores, and hyphens
            </FormHelperText>
          )}
          <FormHelperText>Enter a unique name for your study</FormHelperText>
        </div>
        <div style={{ marginBottom: "32px" }}>
          <TextField
            fullWidth
            variant="standard"
            label="Token Dataset Code"
            value={tokenStudyCode}
            onChange={(event) => setTokenStudyCode(event.target.value)}
            inputProps={{ maxLength: 48 }}
            error={formError.tokenStudyCode.required || formError.tokenStudyCode.valid}
            disabled={loading}
          />
          {formError.tokenStudyCode.required && (
            <FormHelperText error={true}>Token Dataset Code is required</FormHelperText>
          )}
          {formError.tokenStudyCode.valid && (
            <FormHelperText error={true}>
              Token Dataset Code must contain only alphanumeric characters and underscores (max 80 characters)
            </FormHelperText>
          )}
          <FormHelperText>
            Enter a unique identifier that can contain alphanumeric characters and underscores only
          </FormHelperText>
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
