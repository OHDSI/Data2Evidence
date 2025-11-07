import React, { FC, useEffect, useState, useCallback } from "react";
import FormControl from "@mui/material/FormControl";
import FormHelperText from "@mui/material/FormHelperText";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import MuiIconButton from "@mui/material/IconButton";
import Select from "@mui/material/Select";
import { SxProps } from "@mui/system";
import { TrashIcon } from "@portal/components";
import webComponentWrapper from "../../../../../webcomponents/webComponentWrapper";
import { UsefulEvent, NewStudyMetadataInput, DatasetAttributeConfig } from "../../../../../types";
import "./MetadataForm.scss";
import { useTranslation } from "../../../../../contexts";

interface MetadataFormProps {
  studyMetadata: NewStudyMetadataInput;
  index: number;
  attributeConfigs: DatasetAttributeConfig[];
  handleRemoveMetadata: (index: number) => void;
  handleMetadataChange: (attributeId: string, value: string, index: number) => void;
  error: boolean;
}

type FormType = "text" | "number" | "date" | "";

const styles: SxProps = {
  color: "#000080",
  "&::after, &:hover:not(.Mui-disabled)::before": {
    borderBottom: "2px solid #000080",
  },
  ".MuiInputLabel-root": {
    color: "#000080",
    "&.MuiInputLabel-shrink, &.Mui-focused": {
      color: "var(--color-neutral)",
    },
  },
  ".MuiInput-input:focus": {
    backgroundColor: "transparent",
  },
  "&.MuiMenuItem-root:hover": {
    backgroundColor: "#ebf2fa",
  },
};

const MetadataForm: FC<MetadataFormProps> = ({
  studyMetadata,
  index,
  attributeConfigs,
  handleRemoveMetadata,
  handleMetadataChange,
  error,
}) => {
  const { getText, i18nKeys } = useTranslation();
  const [attributeId, setAttributeId] = useState<string>("");
  const [value, setValue] = useState<string>("");
  const [dataType, setDataType] = useState<FormType>("");

  const filterType = useCallback((type: string) => {
    switch (type) {
      case "STRING":
        return "text";
      case "NUMBER":
        return "number";
      case "TIMESTAMP":
        return "date";
      default:
        return "";
    }
  }, []);

  useEffect(() => {
    if (attributeId && attributeConfigs) {
      const attributeConfig = attributeConfigs.find((attribute) => attribute.id === attributeId);
      if (attributeConfig) {
        setDataType(attributeConfig.dataType as FormType);
      } else {
        setDataType("");
      }
    }
  }, [attributeId, attributeConfigs, filterType]);

  useEffect(() => {
    setAttributeId(studyMetadata.attributeId);
    setValue(studyMetadata.value);
  }, [studyMetadata]);

  const handleTypeChange = useCallback(
    (attributeId: string) => {
      // Get attribute config from attributeId
      const attributeConfig = attributeConfigs.filter((attributeConfig) => attributeConfig.id === attributeId)[0];
      filterType(attributeConfig.dataType);
      setAttributeId(attributeConfig.id);
    },
    [filterType, attributeConfigs]
  );

  const handleValueChange = useCallback(
    (value: any) => {
      setValue(value);
      handleMetadataChange(attributeId, value, index);
    },
    [handleMetadataChange, index, attributeId]
  );
  return (
    <div className="metadata-form-component">
      <div className="u-padding-vertical--small">
        <FormControl sx={styles} className="metadata-form" variant="standard" fullWidth>
          <InputLabel id="select-title-label"></InputLabel>
          <Select
            sx={styles}
            labelId="select-title-label"
            className="select"
            onChange={(event) => handleTypeChange(event.target.value)}
            renderValue={(attributeId) => {
              return attributeConfigs.find((attributeConfig) => attributeConfig.id === attributeId)?.name;
            }}
            value={attributeId}
          >
            <MenuItem sx={styles} value="">
              &nbsp;
            </MenuItem>
            {attributeConfigs.map((option) => (
              <MenuItem sx={styles} className="test" value={option.id} key={option.id}>
                {option.name}
              </MenuItem>
            ))}
          </Select>

          <MuiIconButton className="trash-btn" onClick={() => handleRemoveMetadata(index)}>
            <TrashIcon />
          </MuiIconButton>
        </FormControl>
      </div>
      {dataType && (
        <div className="u-padding-vertical--small">
          <d4l-input
            // @ts-ignore
            ref={webComponentWrapper({
              handleChange: (event: UsefulEvent) => handleValueChange(event.target.value),
            })}
            label="Value"
            type={filterType(dataType)}
            value={value}
            error={error}
          />
          {error && <FormHelperText className="form-error">{getText(i18nKeys.METADATA_FORM__REQUIRED)}</FormHelperText>}
        </div>
      )}
    </div>
  );
};

export default MetadataForm;
