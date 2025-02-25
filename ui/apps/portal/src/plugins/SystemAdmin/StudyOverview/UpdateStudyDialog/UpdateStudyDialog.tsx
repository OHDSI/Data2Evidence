import React, { FC, useCallback, useEffect, useState, ChangeEvent, SetStateAction } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import FormHelperText from "@mui/material/FormHelperText";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import { SxProps } from "@mui/system";
import SimpleMdeReact from "react-simplemde-editor";
import { AddSquareIcon, Box, Button, Checkbox, Dialog, Feedback, IconButton } from "@portal/components";
import { api } from "../../../../axios/api";
import { NewStudyMetadataInput, CloseDialogType, UpdateStudyMetadataInput, Study } from "../../../../types";
import { usePaConfigs, useDatasetTagConfigs, useDatasetAttributeConfigs } from "../../../../hooks";
import MetadataForm from "./MetadataForm/MetadataForm";
import "./UpdateStudyDialog.scss";
import { useTranslation } from "../../../../contexts";

interface UpdateStudyDialogProps {
  dataset: Study;
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
}

const mdeOptions = {
  hideIcons: ["side-by-side", "fullscreen"],
  maxHeight: "150px",
};

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
}

const EMPTY_FORM_ERROR: FormError = {
  tokenStudyCode: { required: false, valid: false },
  paConfigId: { required: false },
  name: { required: false },
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
};

const styles: SxProps = {
  ".MuiInputLabel-root": {
    color: "#000080",
    "&.MuiInputLabel-shrink, &.Mui-focused": {
      color: "var(--color-neutral)",
    },
  },
  ".MuiInput-input:focus": {
    backgroundColor: "transparent",
    color: "#000080",
  },
  ".MuiInput-root": {
    color: "var(--color-neutral)",
    "&::after, &:hover:not(.Mui-disabled)::before": {
      borderBottom: "2px solid #000080",
    },
  },
};

const EMPTY_STUDY_METADATA: NewStudyMetadataInput = { attributeId: "", value: "" };

const UpdateStudyDialog: FC<UpdateStudyDialogProps> = ({ dataset, open, onClose }) => {
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
    const { tokenStudyCode, paConfigId, name } = formData;

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

    if (Object.keys(formError).length > 0) {
      setFormError({ ...EMPTY_FORM_ERROR, ...(formError as FormError) });
      return true;
    }
    return false;
  }, [formData, tokenIsValid]);

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

    const { type, tokenStudyCode, name, summary, showRequestAccess, description, paConfigId, visibilityStatus } =
      formData;

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

  const handleRemoveLine = useCallback(
    <T extends {}>(index: number, state: Array<T>, setState: (value: SetStateAction<T[]>) => void) => {
      const copyLine = [...state];
      copyLine.splice(index, 1);
      setState(copyLine);
    },
    []
  );

  const handleAddMetadataForm = useCallback(() => {
    setStudyMetadata([...studyMetadata, EMPTY_STUDY_METADATA]);
  }, [studyMetadata]);

  const handleMetadataChange = useCallback(
    (attributeId: string, valueNew: string, index: number) => {
      const newMetadata = { attributeId: attributeId, value: valueNew };
      const currentMetadata = [...studyMetadata];
      currentMetadata[index] = newMetadata;
      setStudyMetadata(currentMetadata);
    },
    [studyMetadata]
  );

  const handleTagChange = useCallback((event: any, value: string[]) => {
    setStudyTagsData(value);
  }, []);

  return (
    <Dialog
      className="update-study-dialog"
      title={getText(i18nKeys.UPDATE_STUDY_DIALOG__UPDATE_DATASET)}
      closable
      fullWidth
      maxWidth="md"
      open={open}
      onClose={() => handleClose("cancelled")}
      feedback={feedback}
    >
      <Divider />
      <div className="update-study-dialog__content">
        <Box mt={4} fontWeight="bold">
          {getText(i18nKeys.UPDATE_STUDY_DIALOG__DATASET_INFO_CONFIG)}
        </Box>
        <Box mb={4}>
          <TextField
            fullWidth
            variant="standard"
            label={getText(i18nKeys.UPDATE_STUDY_DIALOG__DATASET_NAME)}
            value={formData.name}
            onChange={(event) => handleFormDataChange({ name: event.target.value })}
            error={formError.name.required}
          />
          {formError.name.required && (
            <FormHelperText error={true}>{getText(i18nKeys.UPDATE_STUDY_DIALOG__REQUIRED)}</FormHelperText>
          )}
        </Box>
        <Box mb={4}>
          <TextField
            fullWidth
            variant="standard"
            label={getText(i18nKeys.UPDATE_STUDY_DIALOG__DATASET_SUMMARY)}
            value={formData.summary}
            onChange={(event) => handleFormDataChange({ summary: event.target.value })}
          />
        </Box>
        <div>
          <Checkbox
            checked={formData.showRequestAccess}
            checkbox-id="request-access"
            label={getText(i18nKeys.UPDATE_STUDY_DIALOG__REQUEST)}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              handleFormDataChange({ showRequestAccess: event.target.checked });
            }}
          />
        </div>
        <div>{getText(i18nKeys.UPDATE_STUDY_DIALOG__DESCRIPTION)}</div>
        <SimpleMdeReact
          value={formData.description}
          onChange={(value) => handleFormDataChange({ description: value })}
          options={mdeOptions}
          style={{ marginTop: "11px" }}
        />

        <Box mb={4}>
          <TextField
            fullWidth
            variant="standard"
            label={getText(i18nKeys.UPDATE_STUDY_DIALOG__TYPE)}
            value={formData.type}
            onChange={(event) => handleFormDataChange({ type: event.target.value })}
          />
        </Box>

        <Box mb={4}>
          <TextField
            fullWidth
            variant="standard"
            label={getText(i18nKeys.UPDATE_STUDY_DIALOG__TOKEN_CODE)}
            value={formData.tokenStudyCode}
            onChange={(event) => handleFormDataChange({ tokenStudyCode: event.target.value })}
            error={formError.tokenStudyCode.required || formError.tokenStudyCode.valid}
          />
          {formError.tokenStudyCode.required && (
            <FormHelperText error={true}>{getText(i18nKeys.UPDATE_STUDY_DIALOG__REQUIRED)}</FormHelperText>
          )}
          {formError.tokenStudyCode.valid && (
            <FormHelperText error={true}>{getText(i18nKeys.UPDATE_STUDY_DIALOG__VALID_TOKEN_CODE)}</FormHelperText>
          )}
          <FormHelperText>{getText(i18nKeys.UPDATE_STUDY_DIALOG__CODE_REQUIREMENT)}</FormHelperText>
        </Box>

        <Box mb={4}>
          <FormControl
            sx={styles}
            className="select"
            variant="standard"
            fullWidth
            {...(formError.paConfigId.required ? { error: true } : {})}
          >
            <InputLabel htmlFor="pa-config-option">{getText(i18nKeys.UPDATE_STUDY_DIALOG__PA_CONFIG)}</InputLabel>
            <Select
              sx={styles}
              value={formData.paConfigId}
              onChange={(event: SelectChangeEvent<string>) => handleFormDataChange({ paConfigId: event.target.value })}
              inputProps={{
                name: "paConfigOption",
                id: "pa-config-option",
              }}
            >
              <MenuItem sx={styles} value="">
                &nbsp;
              </MenuItem>
              {paConfigs?.map((config) => (
                <MenuItem sx={styles} key={config.configId} value={config.configId}>
                  {config.configName}
                </MenuItem>
              ))}
            </Select>
            {formError.paConfigId.required && (
              <FormHelperText>{getText(i18nKeys.UPDATE_STUDY_DIALOG__REQUIRED)}</FormHelperText>
            )}
          </FormControl>
        </Box>

        <Box mb={4}>
          <Box fontWeight="bold">{getText(i18nKeys.UPDATE_STUDY_DIALOG__METADATA)}</Box>
          {attributeConfigs.length !== 0 &&
            studyMetadata.map((data, index) => (
              <MetadataForm
                key={index}
                studyMetadata={data}
                index={index}
                attributeConfigs={attributeConfigs.filter(
                  (a) => !studyMetadata.some((m) => m.attributeId === a.id) || data.attributeId === a.id
                )}
                handleRemoveMetadata={() => handleRemoveLine(index, studyMetadata, setStudyMetadata)}
                handleMetadataChange={handleMetadataChange}
                error={formMetadataErrorIndex.includes(index)}
              />
            ))}
          <IconButton
            startIcon={<AddSquareIcon />}
            title={getText(i18nKeys.UPDATE_STUDY_DIALOG__ADD_METADATA)}
            onClick={handleAddMetadataForm}
          />
        </Box>

        <Box fontWeight="bold">{getText(i18nKeys.UPDATE_STUDY_DIALOG__TAGS)}</Box>
        <Box mb={4}>
          <Autocomplete
            multiple
            sx={styles}
            id="autocomplete-tags"
            options={tagConfigs}
            renderTags={(value: string[], getTagProps) =>
              value.map((option: string, index: number) => (
                <Chip variant="outlined" label={option} {...getTagProps({ index })} key={option} />
              ))
            }
            renderInput={(params) => <TextField {...params} label="Tags" variant="standard" />}
            value={studyTagsData}
            onChange={handleTagChange}
          />
        </Box>

        <Box mb={4}>
          <FormControl component="fieldset">
            <FormLabel component="legend">{getText(i18nKeys.UPDATE_STUDY_DIALOG__DATASET_VISIBILITY)}</FormLabel>
            <RadioGroup
              name="visibilityStatusGroup"
              value={formData.visibilityStatus}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                handleFormDataChange({ visibilityStatus: event.target.value });
              }}
            >
              <FormControlLabel
                value="PUBLIC"
                control={<Radio />}
                label={getText(i18nKeys.UPDATE_STUDY_DIALOG__PUBLIC)}
              />
              <FormControlLabel
                value="DEFAULT"
                control={<Radio />}
                label={getText(i18nKeys.UPDATE_STUDY_DIALOG__PRIVATE)}
              />
              <FormControlLabel
                value="HIDDEN"
                control={<Radio />}
                label={getText(i18nKeys.UPDATE_STUDY_DIALOG__HIDDEN)}
              />
            </RadioGroup>
          </FormControl>
        </Box>
      </div>

      <Divider />
      <div className="button-group-actions">
        <Button
          text={getText(i18nKeys.UPDATE_STUDY_DIALOG__CANCEL)}
          onClick={() => handleClose("cancelled")}
          variant="outlined"
          block
          disabled={updating}
        />
        <Button text={getText(i18nKeys.UPDATE_STUDY_DIALOG__SAVE)} onClick={handleSubmit} block loading={updating} />
      </div>
    </Dialog>
  );
};

export default UpdateStudyDialog;
