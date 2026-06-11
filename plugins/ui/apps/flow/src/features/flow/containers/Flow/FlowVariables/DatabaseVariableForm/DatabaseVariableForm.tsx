import React, { FC, useCallback } from "react";
import FormControl from "@mui/material/FormControl";
import FormHelperText from "@mui/material/FormHelperText";
import InputLabel from "@mui/material/InputLabel";
import MuiIconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import { SxProps } from "@mui/system";
import { TextField, TrashIcon } from "@portal/components";
import { DatabaseVariable } from "../../../../types";
import { Database } from "../../../../slices";
import "./DatabaseVariableForm.scss";

const inputStyles: SxProps = {
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

export interface DatabaseVariableFormProps {
  database: DatabaseVariable;
  index: number;
  availableDatabases: Database[];
  isLoadingDatabases: boolean;
  onDatabaseChange: (db: DatabaseVariable, index: number) => void;
  onRemoveDatabase: () => void;
  isDuplicateName?: boolean;
}

export const DatabaseVariableForm: FC<DatabaseVariableFormProps> = ({
  database,
  index,
  availableDatabases,
  isLoadingDatabases,
  onDatabaseChange,
  onRemoveDatabase,
  isDuplicateName = false,
}) => {
  const handleNameChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onDatabaseChange({ ...database, name: event.target.value }, index);
    },
    [database, index, onDatabaseChange]
  );

  const handleCodeChange = useCallback(
    (event: SelectChangeEvent<string>) => {
      onDatabaseChange({ ...database, code: event.target.value }, index);
    },
    [database, index, onDatabaseChange]
  );

  return (
    <div className="database-variable-form-component">
      <div className="u-padding-vertical--small">
        <FormControl sx={inputStyles} className="database-variable-form" variant="standard" fullWidth>
          <TextField
            label="Variable name"
            value={database.name}
            onChange={handleNameChange}
            size="small"
            placeholder="e.g. source_db"
            error={isDuplicateName}
            variant="standard"
            className="database-variable-form__name-field"
          />
          <FormControl variant="standard" className="database-variable-form__code-field">
            <InputLabel>Database code</InputLabel>
            <Select
              value={database.code}
              onChange={handleCodeChange}
              disabled={isLoadingDatabases}
            >
              {availableDatabases.map((db) => (
                <MenuItem key={db.code} value={db.code}>
                  {db.code} - {db.dialect}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <MuiIconButton className="trash-btn" onClick={onRemoveDatabase} tabIndex={-1}>
            <TrashIcon />
          </MuiIconButton>
        </FormControl>
        {isDuplicateName && (
          <FormHelperText className="form-error">Duplicate variable name</FormHelperText>
        )}
      </div>
    </div>
  );
};
