import React, { FC, useState, useCallback } from "react";
import Divider from "@mui/material/Divider";
import FormHelperText from "@mui/material/FormHelperText";
import { Dialog, Button, TextField } from "@portal/components";
import { Feedback } from "../../../../types";
import { api } from "../../../../axios/api";
import { useTenant } from "../../../../hooks";
import { useTranslation } from "../../../../contexts";
import { i18nKeys } from "../../../../contexts/app-context/states";
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
    invalid: boolean;
  };
  analysisSpec: {
    invalid: boolean;
  };
}

const EMPTY_FORM_ERROR: FormError = {
  studyName: { required: false, invalid: false },
  tokenStudyCode: { required: false, invalid: false },
  analysisSpec: { invalid: false },
};

const AddStrategusStudyDialog: FC<AddStrategusStudyDialogProps> = ({ open, onClose }) => {
  const { getText } = useTranslation();
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
    return false;
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
      error = { ...error, tokenStudyCode: { required: true, invalid: false } };
      hasError = true;
    }

    if (tokenStudyCode && !tokenIsValid(tokenStudyCode)) {
      error = { ...error, tokenStudyCode: { required: false, invalid: true } };
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
        mode: "kernel",
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
        message: err?.response?.data?.message || err?.message || getText(i18nKeys.ADD_STRATEGUS_STUDY_DIALOG__ERROR_CREATE),
      });
    } finally {
      setLoading(false);
    }
  }, [studyName, tokenStudyCode, analysisSpec, tenant, onClose, validateForm, getText]);

  return (
    <Dialog
      className="add-strategus-study-dialog"
      title={getText(i18nKeys.ADD_STRATEGUS_STUDY_DIALOG__TITLE)}
      closable
      fullWidth
      maxWidth="md"
      open={open}
      onClose={handleClose}
      feedback={feedback}
    >
      <Divider />
      <div className="add-strategus-study-dialog__content">
        <div style={{ marginTop: "32px", fontWeight: "bold" }}>{getText(i18nKeys.ADD_STRATEGUS_STUDY_DIALOG__STUDY_INFORMATION)}</div>
        <div style={{ marginBottom: "32px" }}>
          <TextField
            fullWidth
            variant="standard"
            label={getText(i18nKeys.ADD_STRATEGUS_STUDY_DIALOG__STUDY_NAME)}
            value={studyName}
            onChange={(event) => setStudyName(event.target.value)}
            error={formError.studyName.required || formError.studyName.invalid}
            disabled={loading}
          />
          {formError.studyName.required && <FormHelperText error={true}>{getText(i18nKeys.ADD_STRATEGUS_STUDY_DIALOG__STUDY_NAME_REQUIRED)}</FormHelperText>}
          {formError.studyName.invalid && (
            <FormHelperText error={true}>
              {getText(i18nKeys.ADD_STRATEGUS_STUDY_DIALOG__STUDY_NAME_INVALID)}
            </FormHelperText>
          )}
          <FormHelperText>{getText(i18nKeys.ADD_STRATEGUS_STUDY_DIALOG__STUDY_NAME_HELPER)}</FormHelperText>
        </div>
        <div style={{ marginBottom: "32px" }}>
          <TextField
            fullWidth
            variant="standard"
            label={getText(i18nKeys.ADD_STRATEGUS_STUDY_DIALOG__TOKEN_DATASET_CODE)}
            value={tokenStudyCode}
            onChange={(event) => setTokenStudyCode(event.target.value)}
            inputProps={{ maxLength: 80 }}
            error={formError.tokenStudyCode.required || formError.tokenStudyCode.invalid}
            disabled={loading}
          />
          {formError.tokenStudyCode.required && (
            <FormHelperText error={true}>{getText(i18nKeys.ADD_STRATEGUS_STUDY_DIALOG__TOKEN_DATASET_CODE_REQUIRED)}</FormHelperText>
          )}
          {formError.tokenStudyCode.invalid && (
            <FormHelperText error={true}>
              {getText(i18nKeys.ADD_STRATEGUS_STUDY_DIALOG__TOKEN_DATASET_CODE_INVALID)}
            </FormHelperText>
          )}
          <FormHelperText>
            {getText(i18nKeys.ADD_STRATEGUS_STUDY_DIALOG__TOKEN_DATASET_CODE_HELPER)}
          </FormHelperText>
        </div>
        <div style={{ marginBottom: "32px" }}>
          <TextField
            fullWidth
            variant="standard"
            label={getText(i18nKeys.ADD_STRATEGUS_STUDY_DIALOG__ANALYSIS_SPEC)}
            multiline
            rows={4}
            value={analysisSpec}
            onChange={(event) => setAnalysisSpec(event.target.value)}
            error={formError.analysisSpec.invalid}
            disabled={loading}
          />
          {formError.analysisSpec.invalid && (
            <FormHelperText error={true}>{getText(i18nKeys.ADD_STRATEGUS_STUDY_DIALOG__ANALYSIS_SPEC_INVALID)}</FormHelperText>
          )}
          <FormHelperText>{getText(i18nKeys.ADD_STRATEGUS_STUDY_DIALOG__ANALYSIS_SPEC_HELPER)}</FormHelperText>
        </div>
      </div>
      <Divider />
      <div className="button-group-actions">
        <Button text={getText(i18nKeys.ADD_STRATEGUS_STUDY_DIALOG__CANCEL)} onClick={handleClose} variant="outlined" block disabled={loading} />
        <Button text={getText(i18nKeys.ADD_STRATEGUS_STUDY_DIALOG__CREATE)} onClick={handleSubmit} block loading={loading} />
      </div>
    </Dialog>
  );
};

export default AddStrategusStudyDialog;
