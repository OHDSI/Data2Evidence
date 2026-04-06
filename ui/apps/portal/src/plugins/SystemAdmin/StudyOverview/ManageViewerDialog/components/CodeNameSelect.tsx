import React, { FC } from "react";
import { Select, MenuItem, TextField } from "@portal/components";
import InputLabel from "@mui/material/InputLabel";
import { ViewerCodeWithQueries } from "../../../../../types";
import { useTranslation } from "../../../../../contexts";
import { i18nKeys } from "../../../../../contexts/app-context/states";

interface CodeNameSelectProps {
  savedCodes: ViewerCodeWithQueries[];
  isNewName: boolean;
  name: string;
  onNameChange: (selectedName: string) => void;
  onNewNameInput: (value: string) => void;
  supportsMultipleCodes: boolean;
  error?: boolean;
  helperText?: string;
}

export const CodeNameSelect: FC<CodeNameSelectProps> = ({
  savedCodes,
  isNewName,
  name,
  onNameChange,
  onNewNameInput,
  supportsMultipleCodes,
  error,
  helperText,
}) => {
  const { getText } = useTranslation();

  if (!supportsMultipleCodes) {
    return (
      <div>
        <InputLabel sx={{ mb: 1 }}>{getText(i18nKeys.CODE_NAME_SELECT__NAME)}</InputLabel>
        <TextField
          sx={{ width: "100%" }}
          variant="standard"
          value={name}
          onChange={(e) => onNewNameInput(e.target.value)}
          placeholder={getText(i18nKeys.CODE_NAME_SELECT__ENTER_NEW_NAME)}
          error={error}
          helperText={helperText}
        />
      </div>
    );
  }

  return (
    <>
      <div>
        <InputLabel sx={{ mb: 1 }}>{getText(i18nKeys.CODE_NAME_SELECT__NAME)}</InputLabel>
        <Select
          sx={{ width: "100%" }}
          variant="standard"
          value={isNewName ? "__new__" : name}
          onChange={(event) => onNameChange(event.target.value)}
        >
          {savedCodes.map((code) => (
            <MenuItem key={code.name} value={code.name}>
              {code.name}
            </MenuItem>
          ))}
          <MenuItem value="__new__">
            <em>{getText(i18nKeys.CODE_NAME_SELECT__NEW)}</em>
          </MenuItem>
        </Select>
      </div>
      {isNewName && (
        <div>
          <InputLabel sx={{ mb: 1 }}>{getText(i18nKeys.CODE_NAME_SELECT__NEW_NAME)}</InputLabel>
          <TextField
            sx={{ width: "100%" }}
            variant="standard"
            value={name}
            onChange={(e) => onNewNameInput(e.target.value)}
            placeholder={getText(i18nKeys.CODE_NAME_SELECT__ENTER_NEW_NAME)}
            error={error}
            helperText={helperText}
          />
        </div>
      )}
    </>
  );
};
