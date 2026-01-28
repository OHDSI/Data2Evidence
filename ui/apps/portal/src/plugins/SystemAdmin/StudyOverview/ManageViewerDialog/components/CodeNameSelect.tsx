import React, { FC } from "react";
import { Select, MenuItem, TextField } from "@portal/components";
import InputLabel from "@mui/material/InputLabel";
import { ViewerCodeWithQueries } from "../../../../../types";

interface CodeNameSelectProps {
  savedCodes: ViewerCodeWithQueries[];
  isNewName: boolean;
  name: string;
  onNameChange: (selectedName: string) => void;
  onNewNameInput: (value: string) => void;
  supportsMultipleCodes: boolean;
}

export const CodeNameSelect: FC<CodeNameSelectProps> = ({
  savedCodes,
  isNewName,
  name,
  onNameChange,
  onNewNameInput,
  supportsMultipleCodes,
}) => {
  if (!supportsMultipleCodes) {
    return (
      <div>
        <InputLabel sx={{ mb: 1 }}>Name</InputLabel>
        <TextField
          sx={{ width: "100%" }}
          variant="standard"
          value={name}
          onChange={(e) => onNewNameInput(e.target.value)}
          placeholder="Enter code name"
        />
      </div>
    );
  }

  return (
    <>
      <div>
        <InputLabel sx={{ mb: 1 }}>Name</InputLabel>
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
            <em>+ New</em>
          </MenuItem>
        </Select>
      </div>
      {isNewName && (
        <div>
          <InputLabel sx={{ mb: 1 }}>New Name</InputLabel>
          <TextField
            sx={{ width: "100%" }}
            variant="standard"
            value={name}
            onChange={(e) => onNewNameInput(e.target.value)}
            placeholder="Enter new name"
          />
        </div>
      )}
    </>
  );
};
