import { Alert, Button, Checkbox, Dialog, MarkdownField, Select, TextField } from "ui-react";
import React, { FC, useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../../../axios/api";
import { FEATURE_FHIR_SERVER } from "../../../../config";
import { useTranslation } from "../../../../contexts";
import { useDbVocabSchemas, useEnabledFeatures, usePaConfigs, useTenant } from "../../../../hooks";
import FlowRunNotificationDialog from "../FlowRunNotificationDialog/FlowRunNotificationDialog";
import {
  CacheDatasetType,
  CloseDialogType,
  Feedback,
  IDatabase,
  NewStudyInput,
  SourceDatasetType,
  Study,
  WebApiDatasetType,
} from "../../../../types";
import {
  filterCreatableDataModels,
  isWebApiManagedDataset,
  parseDatamodelOption,
} from "./datasetType";
import "./AddDataSourceDialog.scss";

interface AddDataSourceDialogProps {
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  studies: Study[];
  databases: IDatabase[];
}

const customDataModelOption: Datamodel = {
  flowName: "custom-flow",
  datamodel: "custom",
  flowId: "",
};

const hanaDatasetTypeOptions: { title: string; type: CacheDatasetType }[] = [
  { title: "OMOP", type: CacheDatasetType.OMOP },
  { title: "Other datamodel", type: CacheDatasetType.NON_OMOP },
];

interface FormData {
  type: string;
  tokenStudyCode: string;
  schemaOption: string;
  cdmSchemaValue: string;
  isSameCdmSchemaForVocab: boolean;
  vocabSchemaValue: string;
  resultsSchemaValue: string;
  autoGenerateResultsSchema: boolean;
  name: string;
  summary: string;
  showRequestAccess: boolean;
  description: string;
  dataModel: string;
  dataModelCustom: string;
  plugin: string;
  databaseCode: string;
  dialect: string;
  paConfigId: string;
  visibilityStatus: string;
}

interface FormError {
  tenantId: {
    required: boolean;
  };
  schemaOption: {
    required: boolean;
  };
  cdmSchemaValue: {
    required: boolean;
  };
  vocabSchemaValue: {
    required: boolean;
  };
  resultsSchemaValue: {
    required: boolean;
  };
  tokenStudyCode: {
    required: boolean;
    valid: boolean;
  };
  dataModel: {
    required: boolean;
  };
  dataModelCustom: {
    required: boolean;
  };
  databaseCode: {
    required: boolean;
  };
  paConfigId: {
    required: boolean;
  };
  name: {
    required: boolean;
  };
  type: {
    required: boolean;
  };
}

const EMPTY_FORM_ERROR: FormError = {
  tenantId: { required: false },
  tokenStudyCode: { required: false, valid: false },
  schemaOption: { required: false },
  cdmSchemaValue: { required: false },
  vocabSchemaValue: { required: false },
  resultsSchemaValue: { required: false },
  dataModel: { required: false },
  dataModelCustom: { required: false },
  databaseCode: { required: false },
  paConfigId: { required: false },
  name: { required: false },
  type: { required: false },
};

const EMPTY_FORM_DATA: FormData = {
  type: SourceDatasetType.SOURCE,
  tokenStudyCode: "",
  schemaOption: "",
  cdmSchemaValue: "", //Optional
  isSameCdmSchemaForVocab: true,
  vocabSchemaValue: "", //Optional
  resultsSchemaValue: "",
  autoGenerateResultsSchema: false,
  name: "",
  summary: "",
  showRequestAccess: false,
  description: "",
  dataModel: "", //Optional
  dataModelCustom: "", //Optional
  plugin: "",
  databaseCode: "", //Optional
  dialect: "",
  paConfigId: "",
  visibilityStatus: "HIDDEN",
};

/**
 * Schema Options Values
 */
interface dropdownOption {
  title: string;
  type: string;
}

interface Datamodel {
  flowName: string;
  datamodel: string;
  flowId: string;
}

// Todo: remove
// hardcoded values for FHIR dataset creation
const FHIR_DB_CODE = "d2e_fhir";
const FHIR_SCHEMA_NAME = "fhir";
const FHIR_DIALECT = "postgres";

export const SchemaTypes = {
  CreateCDM: "create_cdm",
  NoCDM: "no_cdm",
  FHIR: "fhir",
  CustomCDM: "custom_cdm",
  ExistingCDM: "existing_cdm",
};

/**
 * Dialog shown when user is adding a study in admin portal
 * @param param0 AddDataSourceDialogProps
 * @returns The dialog object
 */
const AddDataSourceDialog: FC<AddDataSourceDialogProps> = ({ open, onClose, loading, setLoading, studies, databases }) => {
  const { getText, i18nKeys } = useTranslation();
  const [tenant] = useTenant();
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM_DATA);
  const [formError, setFormError] = useState<FormError>(EMPTY_FORM_ERROR);
  const [dataModelOptions, setDataModelOptions] = useState<string[]>([]);
  const [schemas, setSchemas] = useState<string[]>([]);
  const [paConfigs] = usePaConfigs();
  const [vocabSchemas] = useDbVocabSchemas(formData.databaseCode);

  const [feedback, setFeedback] = useState<Feedback>({});
  const [featureFlags] = useEnabledFeatures();
  const [flowRunId, setFlowRunId] = useState<string | null>(null);
  const [createdDatasetName, setCreatedDatasetName] = useState<string>("");

  const SchemaOptions: dropdownOption[] = useMemo(() => {
    const result: dropdownOption[] = [
      {
        title: getText(i18nKeys.ADD_DATA_SOURCE_DIALOG__CREATE_NEW_SCHEMA),
        type: SchemaTypes.CreateCDM,
      },
      {
        title: getText(i18nKeys.ADD_DATA_SOURCE_DIALOG__EXISTING_SCHEMA),
        type: SchemaTypes.ExistingCDM,
      },
    ];

    if (featureFlags.includes(FEATURE_FHIR_SERVER)) {
      result.push({
        title: getText(i18nKeys.ADD_DATA_SOURCE_DIALOG__CREATE_FHIR),
        type: SchemaTypes.FHIR,
      });
    }

    return result;
  }, [featureFlags]);

  const displayDatabases = useMemo(
    () => [SchemaTypes.CreateCDM, SchemaTypes.CustomCDM, SchemaTypes.ExistingCDM].includes(formData.schemaOption),
    [formData.schemaOption]
  );

  const displayDataModels = useMemo(
    () => formData.databaseCode && ![SchemaTypes.NoCDM, SchemaTypes.FHIR].includes(formData.schemaOption),
    [formData.schemaOption, formData.databaseCode]
  );

  const displayCustomDataModelInput = useMemo(
    () => formData.dataModel.split(" ")[0] === customDataModelOption.datamodel,
    [formData.dataModel]
  );

  const displaySameCdmVocabSchemaCheckbox = useMemo(
    () => [SchemaTypes.CreateCDM, SchemaTypes.CustomCDM, SchemaTypes.ExistingCDM].includes(formData.schemaOption),
    [formData.schemaOption]
  );

  const displayVocabSchemaDropdown = useMemo(
    () =>
      formData.databaseCode &&
      !formData.isSameCdmSchemaForVocab &&
      [SchemaTypes.CreateCDM, SchemaTypes.CustomCDM].includes(formData.schemaOption),
    [formData.databaseCode, formData.isSameCdmSchemaForVocab, formData.schemaOption]
  );

  const displayVocabSchemaInput = useMemo(
    () => formData.schemaOption === SchemaTypes.ExistingCDM && !formData.isSameCdmSchemaForVocab,
    [formData.schemaOption, formData.isSameCdmSchemaForVocab]
  );

  const displaySchemaNameInput = useMemo(
    () => formData.schemaOption === SchemaTypes.CustomCDM || formData.schemaOption === SchemaTypes.ExistingCDM,
    [formData.schemaOption]
  );

  const displayResultsSchemaInput = useMemo(() => formData.schemaOption !== SchemaTypes.FHIR, [formData.schemaOption]);

  const handleClose = useCallback(
    (type: CloseDialogType) => {
      setFeedback({});
      setFormData(EMPTY_FORM_DATA);
      setFormError(EMPTY_FORM_ERROR);
      setFlowRunId(null);
      setCreatedDatasetName("");
      typeof onClose === "function" && onClose(type);
    },
    [onClose]
  );

  const isWebApiManaged = useMemo(
    () => isWebApiManagedDataset(formData.dialect, formData.type),
    [formData.dialect, formData.type]
  );

  const filteredDataModelOptions = useMemo(
    () => filterCreatableDataModels(dataModelOptions, formData.dialect),
    [dataModelOptions, formData.dialect]
  );

  const getDataModels = useCallback(async () => {
    try {
      const dataModelResult: Datamodel[] = await api.dataflow.getDatamodels();

      if (formData.schemaOption === SchemaTypes.ExistingCDM) {
        dataModelResult.push(customDataModelOption);
      }

      const dataModelOptions = dataModelResult.map((dataModel: Datamodel) => {
        return `${dataModel.datamodel} [${dataModel.flowName}]`;
      });

      setDataModelOptions(dataModelOptions);
    } catch (error) {
      console.error(error);
    }
  }, [formData.schemaOption]);

  useEffect(() => {
    if (![SchemaTypes.NoCDM, SchemaTypes.FHIR].includes(formData.schemaOption) && formData.databaseCode) {
      const db = databases.find((db) => db.code === formData.databaseCode);
      if (db) {
        getDataModels();
      }
    }
  }, [databases, formData.databaseCode, formData.schemaOption, getDataModels]);

  useEffect(() => {
    const getSchemas = () => {
      const filterByDb = (isCurrentDb: boolean) => {
        return studies
          .filter((study) => {
            if (study.schemaName)
              return isCurrentDb
                ? study.databaseCode === formData.databaseCode
                : study.databaseCode !== formData.databaseCode;
          })
          .map((study) => study.schemaName.toUpperCase());
      };

      const filteredSchemas = filterByDb(false).filter((schema) => filterByDb(true).indexOf(schema) === -1);
      setSchemas(filteredSchemas);
    };
    getSchemas();
  }, [formData.databaseCode, studies]);

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
    const {
      type,
      tokenStudyCode,
      schemaOption,
      cdmSchemaValue,
      isSameCdmSchemaForVocab,
      vocabSchemaValue,
      resultsSchemaValue,
      dataModel,
      dataModelCustom,
      databaseCode,
      paConfigId,
      name,
      dialect,
    } = formData;

    let formError: FormError | {} = {};
    if (!tokenStudyCode) {
      formError = { ...formError, tokenStudyCode: { required: true } };
    }

    if (tokenStudyCode && !tokenIsValid(tokenStudyCode)) {
      formError = { ...formError, tokenStudyCode: { valid: true } };
    }

    if (![SchemaTypes.NoCDM, SchemaTypes.FHIR].includes(formData.schemaOption) && !databaseCode) {
      formError = { ...formError, databaseCode: { required: true } };
    }

    if (!schemaOption) {
      formError = { ...formError, schemaOption: { required: true } };
    }

    if (schemaOption == SchemaTypes.CustomCDM && cdmSchemaValue == "" && !schemas.includes(formData.cdmSchemaValue)) {
      formError = { ...formError, cdmSchemaValue: { required: true } };
    }

    if ([SchemaTypes.ExistingCDM].includes(schemaOption) && cdmSchemaValue == "") {
      formError = { ...formError, cdmSchemaValue: { required: true } };
    }

    if (![SchemaTypes.NoCDM, SchemaTypes.FHIR].includes(formData.schemaOption) && dataModel == "") {
      formError = { ...formError, dataModel: { required: true } };
    }

    if (schemaOption === SchemaTypes.ExistingCDM && dataModel === customDataModelOption.datamodel && !dataModelCustom) {
      formError = { ...formError, dataModelCustom: { required: true } };
    }

    if (
      [SchemaTypes.CreateCDM, SchemaTypes.CustomCDM, SchemaTypes.ExistingCDM].includes(schemaOption) &&
      !isSameCdmSchemaForVocab &&
      !vocabSchemaValue
    ) {
      formError = { ...formError, vocabSchemaValue: { required: true } };
    }

    // Result schema is only required if:
    // 1. Not FHIR
    // 2. Either not CreateCDM, OR CreateCDM but use default result schema is unchecked
    if (
      !resultsSchemaValue &&
      schemaOption !== SchemaTypes.FHIR &&
      !(schemaOption === SchemaTypes.CreateCDM && formData.autoGenerateResultsSchema)
    ) {
      formError = { ...formError, resultsSchemaValue: { required: true } };
    }

    if (!paConfigId) {
      formError = { ...formError, paConfigId: { required: true } };
    }

    if (!name.trim()) {
      formError = { ...formError, name: { required: true } };
    }

    // Type selection is required for HANA databases
    if (dialect === "hana" && !type) {
      formError = { ...formError, type: { required: true } };
    }

    if (Object.keys(formError).length > 0) {
      console.error("Validation errors:", formError);
      setFormError({ ...EMPTY_FORM_ERROR, ...(formError as FormError) });
      return true;
    }
    return false;
  }, [formData, schemas, tokenIsValid]);

  const handleSubmit = useCallback(async () => {
    console.log("Submitting form data:", formData);
    const hasError = isFormError();
    if (hasError) {
      console.error("Form has errors. Current formData:", formData);
      return;
    }

    setFeedback({});
    setFormError(EMPTY_FORM_ERROR);

    const {
      type,
      tokenStudyCode,
      schemaOption,
      cdmSchemaValue,
      vocabSchemaValue,
      resultsSchemaValue,
      name,
      summary,
      showRequestAccess,
      description,
      dataModel,
      dataModelCustom,
      databaseCode,
      dialect,
      paConfigId,
      visibilityStatus,
    } = formData;
    const dataModelDetails = parseDatamodelOption(dataModel);
    const parsedDataModel =
      dataModelDetails.dataModel === customDataModelOption.datamodel ? dataModelCustom : dataModelDetails.dataModel;

    const parsedDatasetType = dialect === "hana" ? `hana__${type}` : type;

    const input: NewStudyInput = {
      tenantId: tenant?.id || "",
      detail: {
        name: name.trim(),
        summary,
        description,
        showRequestAccess,
      },
      type: parsedDatasetType,
      tokenStudyCode,
      schemaOption,
      cdmSchemaValue,
      vocabSchemaValue,
      resultsSchemaValue,
      dataModel: parsedDataModel,
      plugin: dataModelDetails.plugin,
      databaseCode,
      dialect,
      paConfigId,
      visibilityStatus: dialect === "hana" ? "DEFAULT" : visibilityStatus,
      attributes: [],
      tags: [],
      dashboards: [],
      webApiManaged: isWebApiManaged,
    };

    try {
      setLoading(true);
      const result = await api.gateway.createDataset(input);

      setCreatedDatasetName(name.trim());
      setFlowRunId((result as any)?.flowRunId ?? null);
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.data?.message || err.data,
      });
      console.error("err", err.data);
    } finally {
      setLoading(false);
    }
  }, [formData, tenant, isFormError, setLoading, handleClose, isWebApiManaged]);

  if (createdDatasetName) {
    return (
      <FlowRunNotificationDialog
        title={getText(i18nKeys.ADD_DATA_SOURCE_DIALOG__DATA_SOURCE_CREATED_TITLE)}
        open={open}
        onClose={() => handleClose("success")}
        description={getText(i18nKeys.ADD_DATA_SOURCE_DIALOG__DATA_SOURCE_CREATED_DESCRIPTION, [createdDatasetName])}
        flowRunId={flowRunId}
      />
    );
  }

  return (
    <Dialog
      title={getText(i18nKeys.ADD_DATA_SOURCE_DIALOG__ADD_DATA_SOURCE)}
      size="l"
      open={open}
      busy={loading}
      onClose={() => handleClose("cancelled")}
      actions={
        <>
          <Button variant="secondary" onClick={() => handleClose("cancelled")} disabled={loading}>
            {getText(i18nKeys.ADD_DATA_SOURCE_DIALOG__CANCEL)}
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={loading}>
            {getText(i18nKeys.ADD_DATA_SOURCE_DIALOG__ADD)}
          </Button>
        </>
      }
    >
      <div className="add-data-source-dialog__content">
        {feedback?.message && (
          <Alert severity={feedback.type ?? "error"} variant="banner">
            {feedback.message}
          </Alert>
        )}
        <div style={{ fontWeight: "bold" }}>{getText(i18nKeys.ADD_DATA_SOURCE_DIALOG__INFO_CONFIG)}</div>
        <div>
          <TextField
            label={getText(i18nKeys.ADD_DATA_SOURCE_DIALOG__DATA_SOURCE_NAME)}
            value={formData.name}
            onChange={(value) => handleFormDataChange({ name: value })}
            errorMessages={formError.name.required ? getText(i18nKeys.ADD_DATA_SOURCE_DIALOG__REQUIRED) : undefined}
          />
        </div>
        <div>
          <TextField
            multiline
            rows={4}
            label={getText(i18nKeys.ADD_DATA_SOURCE_DIALOG__DATA_SOURCE_SUMMARY)}
            value={formData.summary}
            onChange={(value) => handleFormDataChange({ summary: value })}
          />
        </div>
        <div>
          <MarkdownField
            label={getText(i18nKeys.ADD_DATA_SOURCE_DIALOG__DESCRIPTION)}
            value={formData.description}
            onChange={(value) => handleFormDataChange({ description: value })}
          />
        </div>
        {/* Schema Options */}
        <div>
          <Select
            label={getText(i18nKeys.ADD_DATA_SOURCE_DIALOG__CDM_SCHEMA_OPTION)}
            value={formData.schemaOption}
            items={(SchemaOptions ?? []).map((option) => ({ label: option.title, value: option.type }))}
            errorMessages={formError.schemaOption.required ? getText(i18nKeys.ADD_DATA_SOURCE_DIALOG__REQUIRED) : undefined}
            onChange={(value) => {
              const schemaOption = value as string;
              const newType = schemaOption === SchemaTypes.FHIR ? SourceDatasetType.FHIR : SourceDatasetType.SOURCE;
              handleFormDataChange({
                schemaOption,
                cdmSchemaValue: "",
                isSameCdmSchemaForVocab: true,
                vocabSchemaValue: "",
                resultsSchemaValue: "",
                autoGenerateResultsSchema: false,
                databaseCode: "",
                dialect: "",
                type: newType,
              });
            }}
          />
        </div>
        {/* DB Input */}
        {displayDatabases && (
          <div>
            <Select
              label={getText(i18nKeys.ADD_DATA_SOURCE_DIALOG__DATABASES)}
              value={formData.databaseCode}
              items={(databases ?? []).map((db) => ({ label: `${db.code}-${db.dialect}`, value: db.code }))}
              errorMessages={formError.databaseCode.required ? getText(i18nKeys.ADD_DATA_SOURCE_DIALOG__REQUIRED) : undefined}
              onChange={(value) => {
                const db = databases.find((db) => db.code === value);
                const isHana = db?.dialect === "hana";

                handleFormDataChange({
                  databaseCode: db?.code || "",
                  dialect: db?.dialect || "",
                  cdmSchemaValue: "",
                  vocabSchemaValue: "",
                  // Set type to empty for HANA where user need to manually select the type
                  type: isHana ? "" : SourceDatasetType.SOURCE,
                });
              }}
            />
          </div>
        )}

        {/*source dataset type */}
        {formData.dialect !== "hana" ? (
          <div>
            <TextField
              disabled
              label={getText(i18nKeys.ADD_DATA_SOURCE_DIALOG__TYPE)}
              value={isWebApiManaged ? WebApiDatasetType.WEBAPI : formData.type}
            />
          </div>
        ) : (
          <div>
            <Select
              label={getText(i18nKeys.ADD_DATA_SOURCE_DIALOG__HANA_TYPE)}
              value={formData.type}
              items={hanaDatasetTypeOptions.map((option) => ({ label: option.title, value: option.type }))}
              errorMessages={formError.type?.required ? getText(i18nKeys.ADD_DATA_SOURCE_DIALOG__REQUIRED) : undefined}
              onChange={(value) => handleFormDataChange({ type: value as CacheDatasetType })}
            />
          </div>
        )}

        {/* Custom Schema Input */}
        {displaySchemaNameInput &&
          (formData.schemaOption === SchemaTypes.ExistingCDM ? (
            <div>
              <TextField
                label={getText(i18nKeys.ADD_DATA_SOURCE_DIALOG__SCHEMA_NAME)}
                value={formData.cdmSchemaValue}
                onChange={(value) => {
                  const cdmSchemaValue = value;
                  const changes: any = { cdmSchemaValue };
                  // Use default result schema if checkbox is checked
                  if (formData.autoGenerateResultsSchema) {
                    changes.resultsSchemaValue = cdmSchemaValue ? `${cdmSchemaValue}_results` : "";
                  }
                  handleFormDataChange(changes);
                }}
                errorMessages={formError.cdmSchemaValue.required ? getText(i18nKeys.ADD_DATA_SOURCE_DIALOG__REQUIRED) : undefined}
              />
            </div>
          ) : formData.schemaOption === SchemaTypes.CustomCDM ? (
            <div>
              <Select
                searchable
                label={getText(i18nKeys.ADD_DATA_SOURCE_DIALOG__SCHEMA_NAME)}
                value={formData.cdmSchemaValue}
                items={schemas.map((schema) => ({ label: schema, value: schema }))}
                disabled={schemas.length === 0}
                errorMessages={
                  schemas.length === 0
                    ? getText(i18nKeys.ADD_DATA_SOURCE_DIALOG__NO_AVAILABLE_SCHEMA)
                    : formError.cdmSchemaValue.required
                      ? getText(i18nKeys.ADD_DATA_SOURCE_DIALOG__INVALID_SCHEMA_NAME)
                      : undefined
                }
                onChange={(value) => {
                  const cdmSchemaValue = value as string;
                  const changes: any = { cdmSchemaValue };
                  // Use default result schema if checkbox is checked
                  if (formData.autoGenerateResultsSchema && cdmSchemaValue) {
                    changes.resultsSchemaValue = `${cdmSchemaValue}_results`;
                  }
                  handleFormDataChange(changes);
                }}
              />
            </div>
          ) : (
            formData.schemaOption === SchemaTypes.FHIR && (
              <div>
                {/* Use vocab schemas defined in the database as the schema options */}
                <Select
                  label={getText(i18nKeys.ADD_DATA_SOURCE_DIALOG__SCHEMA_NAME)}
                  value={formData.cdmSchemaValue}
                  items={(vocabSchemas[formData.databaseCode] ?? []).map((vocabSchema) => ({
                    label: vocabSchema,
                    value: vocabSchema,
                  }))}
                  errorMessages={formError.cdmSchemaValue.required ? getText(i18nKeys.ADD_DATA_SOURCE_DIALOG__REQUIRED) : undefined}
                  onChange={(value) => handleFormDataChange({ cdmSchemaValue: value as string })}
                />
              </div>
            )
          ))}
        {displaySameCdmVocabSchemaCheckbox && (
          <div>
            <Checkbox
              checked={formData.isSameCdmSchemaForVocab}
              label={getText(i18nKeys.ADD_DATA_SOURCE_DIALOG__USE_SAME_SCHEMA)}
              onChange={(checked) => {
                const isSameCdmSchemaForVocab = checked;
                handleFormDataChange(
                  isSameCdmSchemaForVocab
                    ? { vocabSchemaValue: "", isSameCdmSchemaForVocab }
                    : { isSameCdmSchemaForVocab }
                );
              }}
            />
          </div>
        )}
        {/* Vocab Schema Dropdown */}
        {displayVocabSchemaDropdown ? (
          <div>
            <Select
              label={getText(i18nKeys.ADD_DATA_SOURCE_DIALOG__VOCAB_SCHEMA_NAME)}
              value={formData.vocabSchemaValue}
              items={(vocabSchemas[formData.databaseCode] ?? []).map((vocabSchema) => ({
                label: vocabSchema,
                value: vocabSchema,
              }))}
              errorMessages={formError.vocabSchemaValue.required ? getText(i18nKeys.ADD_DATA_SOURCE_DIALOG__REQUIRED) : undefined}
              onChange={(value) => handleFormDataChange({ vocabSchemaValue: value as string })}
            />
          </div>
        ) : (
          // Custom Vocab Schema Input
          displayVocabSchemaInput && (
            <div>
              <TextField
                label={getText(i18nKeys.ADD_DATA_SOURCE_DIALOG__VOCAB_SCHEMA_NAME)}
                value={formData.vocabSchemaValue}
                onChange={(value) => handleFormDataChange({ vocabSchemaValue: value })}
                errorMessages={formError.vocabSchemaValue.required ? getText(i18nKeys.ADD_DATA_SOURCE_DIALOG__REQUIRED) : undefined}
              />
            </div>
          )
        )}
        {displayResultsSchemaInput && (
          <>
            <div>
              <Checkbox
                checked={formData.autoGenerateResultsSchema}
                label={getText(i18nKeys.ADD_DATA_SOURCE_DIALOG__AUTO_GENERATE_RESULT_SCHEMA)}
                onChange={(checked) => {
                  const autoGenerateResultsSchema = checked;
                  const changes: any = { autoGenerateResultsSchema };
                  // If checked, use default result schema name
                  if (autoGenerateResultsSchema) {
                    if (formData.schemaOption === SchemaTypes.CreateCDM) {
                      // For CreateCDM, the value will be generated in the backend
                      changes.resultsSchemaValue = "";
                    } else if (formData.cdmSchemaValue) {
                      // For other types, generate it based on cdm schema value
                      changes.resultsSchemaValue = `${formData.cdmSchemaValue}_results`;
                    }
                  }
                  handleFormDataChange(changes);
                }}
              />
            </div>
            {/* Hide textbox for CreateCDM when checkbox is checked */}
            {!(formData.schemaOption === SchemaTypes.CreateCDM && formData.autoGenerateResultsSchema) && (
              <div>
                <TextField
                  label={getText(i18nKeys.ADD_DATA_SOURCE_DIALOG__RESULT_SCHEMA_NAME)}
                  value={formData.resultsSchemaValue}
                  onChange={(value) => handleFormDataChange({ resultsSchemaValue: value })}
                  errorMessages={formError.resultsSchemaValue.required ? getText(i18nKeys.ADD_DATA_SOURCE_DIALOG__REQUIRED) : undefined}
                  disabled={formData.autoGenerateResultsSchema}
                />
              </div>
            )}
          </>
        )}
        {/* Data Model Options */}
        {displayDataModels && (
          <div>
            <Select
              label={getText(i18nKeys.ADD_DATA_SOURCE_DIALOG__DATA_MODEL_OPTION)}
              value={formData.dataModel}
              items={(filteredDataModelOptions ?? []).map((model) => ({ label: model, value: model }))}
              errorMessages={formError.dataModel.required ? getText(i18nKeys.ADD_DATA_SOURCE_DIALOG__REQUIRED) : undefined}
              onChange={(value) => handleFormDataChange({ dataModel: value as string })}
            />
          </div>
        )}
        {/* Custom Data Model Options */}
        {displayCustomDataModelInput && (
          <div>
            <TextField
              label={getText(i18nKeys.ADD_DATA_SOURCE_DIALOG__CUSTOM_DATA_MODEL_OPTION)}
              value={formData.dataModelCustom}
              onChange={(value) => handleFormDataChange({ dataModelCustom: value })}
              errorMessages={formError.dataModelCustom.required ? getText(i18nKeys.ADD_DATA_SOURCE_DIALOG__REQUIRED) : undefined}
            />
          </div>
        )}
        <div>
          <Select
            label={getText(i18nKeys.ADD_DATA_SOURCE_DIALOG__PA_CONFIG)}
            value={formData.paConfigId}
            items={(paConfigs ?? []).map((config) => ({ label: config.configName, value: config.configId }))}
            errorMessages={formError.paConfigId.required ? getText(i18nKeys.ADD_DATA_SOURCE_DIALOG__REQUIRED) : undefined}
            onChange={(value) => handleFormDataChange({ paConfigId: value as string })}
          />
        </div>
        <div>
          <TextField
            label={getText(i18nKeys.ADD_DATA_SOURCE_DIALOG__TOKEN_DATA_SOURCE_CODE)}
            value={formData.tokenStudyCode}
            onChange={(value) => handleFormDataChange({ tokenStudyCode: value })}
            maxlength={48}
            errorMessages={[
              ...(formError.tokenStudyCode.required ? [getText(i18nKeys.ADD_DATA_SOURCE_DIALOG__REQUIRED)] : []),
              ...(formError.tokenStudyCode.valid ? [getText(i18nKeys.ADD_DATA_SOURCE_DIALOG__ENTER_VALID_DATA_SOURCE_CODE)] : []),
            ]}
          />
          <div className="add-data-source-dialog__field-hint">
            {getText(i18nKeys.ADD_DATA_SOURCE_DIALOG__DATA_SOURCE_CODE_ALLOWED_VALUES)}
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default AddDataSourceDialog;
