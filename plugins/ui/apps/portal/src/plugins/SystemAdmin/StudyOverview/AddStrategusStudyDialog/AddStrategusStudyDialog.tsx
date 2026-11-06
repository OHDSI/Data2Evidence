import { FC, useState, useCallback } from "react";
import { Dialog, Button, TextField, Alert } from "ui-react";
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
    return !!token.match(tokenFormat);
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
        message:
          err?.response?.data?.message ||
          err?.message ||
          getText(i18nKeys.ADD_STRATEGUS_STUDY_DIALOG__ERROR_CREATE),
      });
    } finally {
      setLoading(false);
    }
  }, [studyName, tokenStudyCode, analysisSpec, tenant, onClose, validateForm, getText]);

  const studyNameError = formError.studyName.required
    ? getText(i18nKeys.ADD_STRATEGUS_STUDY_DIALOG__STUDY_NAME_REQUIRED)
    : formError.studyName.invalid
      ? getText(i18nKeys.ADD_STRATEGUS_STUDY_DIALOG__STUDY_NAME_INVALID)
      : undefined;

  const tokenError = formError.tokenStudyCode.required
    ? getText(i18nKeys.ADD_STRATEGUS_STUDY_DIALOG__TOKEN_DATASET_CODE_REQUIRED)
    : formError.tokenStudyCode.invalid
      ? getText(i18nKeys.ADD_STRATEGUS_STUDY_DIALOG__TOKEN_DATASET_CODE_INVALID)
      : undefined;

  return (
    <Dialog
      title={getText(i18nKeys.ADD_STRATEGUS_STUDY_DIALOG__TITLE)}
      size="l"
      open={open}
      busy={loading}
      onClose={handleClose}
      actions={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            {getText(i18nKeys.ADD_STRATEGUS_STUDY_DIALOG__CANCEL)}
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={loading}>
            {getText(i18nKeys.ADD_STRATEGUS_STUDY_DIALOG__CREATE)}
          </Button>
        </>
      }
    >
      <div className="add-strategus-study-dialog__content">
        {feedback?.message && (
          <Alert severity={feedback.type ?? "error"} variant="banner">
            {feedback.message}
          </Alert>
        )}
        <div style={{ fontWeight: "bold" }}>
          {getText(i18nKeys.ADD_STRATEGUS_STUDY_DIALOG__STUDY_INFORMATION)}
        </div>
        <div>
          <TextField
            label={getText(i18nKeys.ADD_STRATEGUS_STUDY_DIALOG__STUDY_NAME)}
            value={studyName}
            onChange={setStudyName}
            errorMessages={studyNameError}
            disabled={loading}
          />
          <div className="add-strategus-study-dialog__field-hint">
            {getText(i18nKeys.ADD_STRATEGUS_STUDY_DIALOG__STUDY_NAME_HELPER)}
          </div>
        </div>
        <div>
          <TextField
            label={getText(i18nKeys.ADD_STRATEGUS_STUDY_DIALOG__TOKEN_DATASET_CODE)}
            value={tokenStudyCode}
            onChange={setTokenStudyCode}
            maxlength={80}
            errorMessages={tokenError}
            disabled={loading}
          />
          <div className="add-strategus-study-dialog__field-hint">
            {getText(i18nKeys.ADD_STRATEGUS_STUDY_DIALOG__TOKEN_DATASET_CODE_HELPER)}
          </div>
        </div>
        <div>
          <TextField
            label={getText(i18nKeys.ADD_STRATEGUS_STUDY_DIALOG__ANALYSIS_SPEC)}
            multiline
            rows={4}
            value={analysisSpec}
            onChange={setAnalysisSpec}
            errorMessages={
              formError.analysisSpec.invalid
                ? getText(i18nKeys.ADD_STRATEGUS_STUDY_DIALOG__ANALYSIS_SPEC_INVALID)
                : undefined
            }
            disabled={loading}
          />
          <div className="add-strategus-study-dialog__field-hint">
            {getText(i18nKeys.ADD_STRATEGUS_STUDY_DIALOG__ANALYSIS_SPEC_HELPER)}
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default AddStrategusStudyDialog;
