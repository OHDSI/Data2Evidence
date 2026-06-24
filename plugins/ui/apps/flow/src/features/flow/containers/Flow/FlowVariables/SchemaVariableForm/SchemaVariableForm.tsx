import React, { FC, useCallback } from "react";
import FormControl from "@mui/material/FormControl";
import FormHelperText from "@mui/material/FormHelperText";
import MuiIconButton from "@mui/material/IconButton";
import { TextField, TrashIcon } from "@portal/components";
import { SchemaVariable } from "../../../../types";
import "./SchemaVariableForm.scss";

export interface SchemaVariableFormProps {
  schema: SchemaVariable;
  index: number;
  onSchemaChange: (schema: SchemaVariable, index: number) => void;
  onRemoveSchema: () => void;
  isDuplicateName?: boolean;
}

export const SchemaVariableForm: FC<SchemaVariableFormProps> = ({
  schema,
  index,
  onSchemaChange,
  onRemoveSchema,
  isDuplicateName = false,
}) => {
  const handleNameChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onSchemaChange({ ...schema, name: event.target.value }, index);
    },
    [schema, index, onSchemaChange]
  );

  const handleSchemaChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onSchemaChange({ ...schema, schema: event.target.value }, index);
    },
    [schema, index, onSchemaChange]
  );

  return (
    <div className="schema-variable-form-component">
      <div className="u-padding-vertical--small">
        <FormControl className="schema-variable-form" variant="standard" fullWidth>
          <TextField
            label="Variable name"
            value={schema.name}
            onChange={handleNameChange}
            size="small"
            placeholder="e.g. cdm_schema"
            error={isDuplicateName}
            variant="standard"
            className="schema-variable-form__name-field"
          />
          <TextField
            label="Schema name"
            value={schema.schema}
            onChange={handleSchemaChange}
            size="small"
            placeholder="e.g. cdmdefault"
            variant="standard"
            className="schema-variable-form__schema-field"
          />
          <MuiIconButton className="trash-btn" onClick={onRemoveSchema} tabIndex={-1}>
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
