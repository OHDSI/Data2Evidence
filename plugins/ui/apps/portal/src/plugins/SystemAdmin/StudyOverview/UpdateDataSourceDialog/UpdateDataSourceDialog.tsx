import { FC, useCallback, useEffect, useState } from "react";
import { Alert, Button, Checkbox, Dialog, MarkdownField, RadioGroup, Select, TextField } from "ui-react";
import { api } from "../../../../axios/api";
import {
  NewStudyMetadataInput,
  CloseDialogType,
  UpdateStudyMetadataInput,
  Study,
  SourceDatasetType,
  Feedback,
} from "../../../../types";
import { usePaConfigs, useDatasetTagConfigs, useDatasetAttributeConfigs } from "../../../../hooks";
import "./UpdateDataSourceDialog.scss";
import { useTranslation } from "../../../../contexts";

const DATASET_SOURCE_TYPES = new Set<string>(Object.values(SourceDatasetType));

interface UpdateDataSourceDialogProps {
  dataset: Study;
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
}

interface FormData {
  id: string;
  tokenStudyCode: string;
  type: string;
  name: string;
  summary: string;
  showRequestAccess: boolean;
  description: string;
  paConfigId: string;
  visibilityStatus: string;
  vocabSchemaName: string;
  resultsSchemaName: string;
}

interface FormError {
  tokenStudyCode: {
    required: boolean;
    valid: boolean;
  };
  paConfigId: {
    required: boolean;
  };
  name: {
    required: boolean;
  };
  vocabSchemaName: {
    required: boolean;
  };
  resultsSchemaName: {
    required: boolean;
  };
}

const EMPTY_FORM_ERROR: FormError = {
  tokenStudyCode: { required: false, valid: false },
  paConfigId: { required: false },
  name: { required: false },
  vocabSchemaName: { required: false },
  resultsSchemaName: { required: false },
};

const EMPTY_FORM_DATA: FormData = {
  id: "",
  type: "",
  tokenStudyCode: "",
  name: "",
  summary: "",
  showRequestAccess: false,
  description: "",
  paConfigId: "",
  visibilityStatus: "DEFAULT",
  vocabSchemaName: "",
  resultsSchemaName: "",
};

const EMPTY_STUDY_METADATA: NewStudyMetadataInput = { attributeId: "", value: "" };

const UpdateDataSourceDialog: FC<UpdateDataSourceDialogProps> = ({ dataset, open, onClose }) => {
  const { getText, i18nKeys } = useTranslation();
  const datasetId = dataset.id;
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM_DATA);
  const [formError, setFormError] = useState<FormError>(EMPTY_FORM_ERROR);
  const [paConfigs] = usePaConfigs();
  const [tagConfigs] = useDatasetTagConfigs();
  const [attributeConfigs] = useDatasetAttributeConfigs();
  const [studyMetadata, setStudyMetadata] = useState<NewStudyMetadataInput[]>([EMPTY_STUDY_METADATA]);
  const [studyTagsData, setStudyTagsData] = useState<Array<string>>([]);
  const [updating, setUpdating] = useState(false);

  const [feedback, setFeedback] = useState<Feedback>({});
  const [formMetadataErrorIndex, setFormMetadataErrorIndex] = useState<Array<Number>>([]);

  useEffect(() => {
    setFormMetadataErrorIndex([]);

    if (dataset) {
      setFormData({
        id: dataset.id,
        tokenStudyCode: dataset.tokenStudyCode,
        type: dataset.type,
        paConfigId: dataset.paConfigId,
        name: dataset.studyDetail?.name || "",
        summary: dataset.studyDetail?.summary || "",
        showRequestAccess: dataset.studyDetail?.showRequestAccess || false,
        description: dataset.studyDetail?.description || "",
        visibilityStatus: dataset.visibilityStatus,
        vocabSchemaName: dataset.vocabSchemaName || "",
        resultsSchemaName: dataset.resultsSchemaName || "",
      });
    } else {
      setFormData(EMPTY_FORM_DATA);
    }
    dataset?.tags && setStudyTagsData(dataset?.tags?.map((tag) => tag.name));
    if (dataset?.attributes && dataset?.attributes?.length > 0) {
      setStudyMetadata(
        dataset?.attributes?.map((attribute) => ({
          attributeId: attribute.attributeId,
          value: attribute.value,
        }))
      );
    } else {
      setStudyMetadata([EMPTY_STUDY_METADATA]);
    }
  }, [dataset, open]);

  const handleClose = useCallback(
    (type: CloseDialogType) => {
      setFeedback({});
      setFormData(EMPTY_FORM_DATA);
      setFormError(EMPTY_FORM_ERROR);
      setStudyMetadata([]);

      typeof onClose === "function" && onClose(type);
    },
    [onClose, setFeedback]
  );

  const handleFormDataChange = useCallback((changes: { [field: string]: any }) => {
    setFormData((formData) => ({ ...formData, ...changes }));
  }, []);

  const tokenIsValid = useCallback((token: string) => {
    const tokenFormat = /^[a-zA-Z0-9_]{1,80}$/;
    if (token.match(tokenFormat)) {
      return true;
    }
  }, []);

  const isFormError = useCallback(() => {
    const { tokenStudyCode, paConfigId, name, vocabSchemaName, resultsSchemaName } = formData;

    let formError: FormError | {} = {};
    if (!tokenStudyCode) {
      formError = { ...formError, tokenStudyCode: { required: true } };
    }

    if (tokenStudyCode && !tokenIsValid(tokenStudyCode)) {
      formError = { ...formError, tokenStudyCode: { valid: true } };
    }

    if (!paConfigId) {
      formError = { ...formError, paConfigId: { required: true } };
    }

    if (!name) {
      formError = { ...formError, name: { required: true } };
    }

    if (!vocabSchemaName) {
      formError = { ...formError, vocabSchemaName: { required: true } };
    }

    if (!DATASET_SOURCE_TYPES.has(dataset.type)) {
      if (!resultsSchemaName) {
        formError = { ...formError, resultsSchemaName: { required: true } };
      }
    }

    if (Object.keys(formError).length > 0) {
      setFormError({ ...EMPTY_FORM_ERROR, ...(formError as FormError) });
      return true;
    }
    return false;
  }, [formData, tokenIsValid, dataset]);

  const isFormMetadataError = useCallback(() => {
    const indexError: Number[] = [];
    studyMetadata.forEach((metadata, index) => {
      if (!metadata.value && metadata.attributeId) {
        indexError.push(index);
      }
    });

    setFormMetadataErrorIndex(indexError);
    return indexError.length > 0;
  }, [studyMetadata]);

  const handleSubmit = useCallback(async () => {
    if (isFormError() || isFormMetadataError()) {
      return;
    }

    setFeedback({});
    setFormError(EMPTY_FORM_ERROR);

    const {
      type,
      tokenStudyCode,
      name,
      summary,
      showRequestAccess,
      description,
      paConfigId,
      visibilityStatus,
      vocabSchemaName,
      resultsSchemaName,
    } = formData;

    try {
      const data: UpdateStudyMetadataInput = {
        id: datasetId,
        detail: {
          name,
          summary,
          description,
          showRequestAccess,
        },
        type,
        tokenDatasetCode: tokenStudyCode,
        vocabSchemaName,
        resultsSchemaName,
        paConfigId,
        visibilityStatus,
        attributes: studyMetadata.filter((info) => info.attributeId !== ""),
        tags: studyTagsData?.map((tagName) => tagName),
        dashboards: [],
      };
      setUpdating(true);
      await api.systemPortal.updateDataset(data);
      handleClose("success");
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.data?.message || err.data,
      });
      console.error("err", err.data);
    } finally {
      setUpdating(false);
    }
  }, [formData, datasetId, studyTagsData, studyMetadata, isFormMetadataError, isFormError, handleClose]);

  return (
    <Dialog
      title={getText(i18nKeys.UPDATE_DATA_SOURCE_DIALOG__UPDATE_DATA_SOURCE)}
      size="l"
      open={open}
      busy={updating}
      onClose={() => handleClose("cancelled")}
      actions={
        <>
          <Button variant="secondary" onClick={() => handleClose("cancelled")} disabled={updating}>
            {getText(i18nKeys.UPDATE_DATA_SOURCE_DIALOG__CANCEL)}
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={updating}>
            {getText(i18nKeys.UPDATE_DATA_SOURCE_DIALOG__SAVE)}
          </Button>
        </>
      }
    >
      <div className="update-data-source-dialog__content">
        {feedback?.message && (
          <Alert severity={feedback.type ?? "error"} variant="banner">
            {feedback.message}
          </Alert>
        )}
        {!DATASET_SOURCE_TYPES.has(dataset.type) && (
          <>
            <div style={{ fontWeight: "bold" }}>
              {getText(i18nKeys.UPDATE_DATA_SOURCE_DIALOG__DATA_SOURCE_INFO_CONFIG)}
            </div>
            <div>
              <TextField
                label={getText(i18nKeys.UPDATE_DATA_SOURCE_DIALOG__DATA_SOURCE_NAME)}
                value={formData.name}
                onChange={(value) => handleFormDataChange({ name: value })}
                errorMessages={
                  formError.name.required ? getText(i18nKeys.UPDATE_DATA_SOURCE_DIALOG__REQUIRED) : undefined
                }
              />
            </div>
            <div>
              <TextField
                multiline
                rows={4}
                label={getText(i18nKeys.UPDATE_DATA_SOURCE_DIALOG__DATA_SOURCE_SUMMARY)}
                value={formData.summary}
                onChange={(value) => handleFormDataChange({ summary: value })}
              />
            </div>
            <div>
              <Checkbox
                checked={formData.showRequestAccess}
                label={getText(i18nKeys.UPDATE_DATA_SOURCE_DIALOG__REQUEST)}
                onChange={(checked) => handleFormDataChange({ showRequestAccess: checked })}
              />
            </div>
            <div>
              <MarkdownField
                label={getText(i18nKeys.UPDATE_DATA_SOURCE_DIALOG__DESCRIPTION)}
                value={formData.description}
                onChange={(value) => handleFormDataChange({ description: value })}
              />
            </div>

            <div>
              <TextField
                disabled
                label={getText(i18nKeys.UPDATE_DATA_SOURCE_DIALOG__TYPE)}
                value={formData.type}
                onChange={(value) => handleFormDataChange({ type: value })}
              />
            </div>

            <div>
              <TextField
                disabled
                label={getText(i18nKeys.UPDATE_DATA_SOURCE_DIALOG__TOKEN_CODE)}
                value={formData.tokenStudyCode}
                onChange={(value) => handleFormDataChange({ tokenStudyCode: value })}
                errorMessages={[
                  ...(formError.tokenStudyCode.required ? [getText(i18nKeys.UPDATE_DATA_SOURCE_DIALOG__REQUIRED)] : []),
                  ...(formError.tokenStudyCode.valid
                    ? [getText(i18nKeys.UPDATE_DATA_SOURCE_DIALOG__VALID_TOKEN_CODE)]
                    : []),
                ]}
              />
              <div className="update-data-source-dialog__field-hint">
                {getText(i18nKeys.UPDATE_DATA_SOURCE_DIALOG__CODE_REQUIREMENT)}
              </div>
            </div>

            <div>
              <TextField
                label={getText(i18nKeys.UPDATE_DATA_SOURCE_DIALOG__VOCAB_SCHEMA_NAME)}
                value={formData.vocabSchemaName}
                onChange={(value) => handleFormDataChange({ vocabSchemaName: value })}
                errorMessages={
                  formError.vocabSchemaName.required ? getText(i18nKeys.UPDATE_DATA_SOURCE_DIALOG__REQUIRED) : undefined
                }
              />
            </div>

            <div>
              <TextField
                label={getText(i18nKeys.UPDATE_DATA_SOURCE_DIALOG__RESULT_SCHEMA_NAME)}
                value={formData.resultsSchemaName}
                onChange={(value) => handleFormDataChange({ resultsSchemaName: value })}
                errorMessages={
                  formError.resultsSchemaName.required
                    ? getText(i18nKeys.UPDATE_DATA_SOURCE_DIALOG__REQUIRED)
                    : undefined
                }
              />
            </div>

            <div>
              <Select
                label={getText(i18nKeys.UPDATE_DATA_SOURCE_DIALOG__PA_CONFIG)}
                value={formData.paConfigId}
                items={(paConfigs ?? []).map((config) => ({ label: config.configName, value: config.configId }))}
                errorMessages={
                  formError.paConfigId.required ? getText(i18nKeys.UPDATE_DATA_SOURCE_DIALOG__REQUIRED) : undefined
                }
                onChange={(value) => handleFormDataChange({ paConfigId: value as string })}
              />
            </div>
          </>
        )}

        {DATASET_SOURCE_TYPES.has(dataset.type) && (
          <div>
            <TextField
              label={getText(i18nKeys.UPDATE_DATA_SOURCE_DIALOG__VOCAB_SCHEMA_NAME)}
              value={formData.vocabSchemaName}
              onChange={(value) => handleFormDataChange({ vocabSchemaName: value })}
              errorMessages={
                formError.vocabSchemaName.required ? getText(i18nKeys.UPDATE_DATA_SOURCE_DIALOG__REQUIRED) : undefined
              }
            />
          </div>
        )}

        {!DATASET_SOURCE_TYPES.has(dataset.type) && (
          <>
            <div style={{ fontWeight: "bold" }}>
              {getText(i18nKeys.UPDATE_DATA_SOURCE_DIALOG__TAGS)}
            </div>
            <div>
              <Select
                multiple
                searchable
                label={getText(i18nKeys.UPDATE_DATA_SOURCE_DIALOG__TAGS)}
                value={studyTagsData}
                items={(tagConfigs ?? []).map((tag) => ({ label: tag, value: tag }))}
                onChange={(value) => setStudyTagsData((value as string[]) ?? [])}
              />
            </div>

            <div>
              <div className="update-data-source-dialog__label">
                {getText(i18nKeys.UPDATE_DATA_SOURCE_DIALOG__DATA_SOURCE_VISIBILITY)}
              </div>
              <RadioGroup
                name="visibilityStatusGroup"
                value={formData.visibilityStatus}
                onChange={(value) => handleFormDataChange({ visibilityStatus: value })}
                options={[
                  { label: getText(i18nKeys.UPDATE_DATA_SOURCE_DIALOG__PUBLIC), value: "PUBLIC" },
                  { label: getText(i18nKeys.UPDATE_DATA_SOURCE_DIALOG__PRIVATE), value: "DEFAULT" },
                  { label: getText(i18nKeys.UPDATE_DATA_SOURCE_DIALOG__HIDDEN), value: "HIDDEN" },
                ]}
              />
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
};

export default UpdateDataSourceDialog;
