import React, { FC, useCallback } from "react";
import FormControl from "@mui/material/FormControl";
import FormHelperText from "@mui/material/FormHelperText";
import MuiIconButton from "@mui/material/IconButton";
import { SxProps } from "@mui/system";
import { TextField, TrashIcon } from "@portal/components";
import { KeyValue } from "../../../../types";
import "./VariableForm.scss";

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
};

export interface VariableFormProps {
  variable: KeyValue;
  index: number;
  onVariableChange: (key: string, value: string, index: number) => void;
  onRemoveVariable: () => void;
  error?: boolean;
  isDuplicateKey?: boolean;
}

export const VariableForm: FC<VariableFormProps> = ({
  variable,
  index,
  onVariableChange,
  onRemoveVariable,
  error = false,
  isDuplicateKey = false,
}) => {
  const handleKeyChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onVariableChange(event.target.value, variable.value, index);
    },
    [variable.value, index, onVariableChange]
  );

  const handleValueChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onVariableChange(variable.key, event.target.value, index);
    },
    [variable.key, index, onVariableChange]
  );

  return (
    <div className="variable-form-component">
      <div className="u-padding-vertical--small">
        <FormControl
          sx={styles}
          className="variable-form"
          variant="standard"
          fullWidth
        >
          <TextField
            label="Key"
            value={variable.key}
            onChange={handleKeyChange}
            size="small"
            placeholder="Enter variable key"
            error={isDuplicateKey}
            variant="standard"
            className="variable-form__key-field"
          />
          <TextField
            label="Value"
            value={variable.value}
            onChange={handleValueChange}
            size="small"
            placeholder="Enter variable value"
            multiline
            maxRows={4}
            variant="standard"
            sx={styles}
            className="variable-form__value-field"
          />
          <MuiIconButton
            className="trash-btn"
            onClick={onRemoveVariable}
            tabIndex={-1}
          >
            <TrashIcon />
          </MuiIconButton>
        </FormControl>
        {(error || isDuplicateKey) && (
          <FormHelperText className="form-error">
            {isDuplicateKey ? "Duplicate key" : "Required"}
          </FormHelperText>
        )}
      </div>
    </div>
  );
};
