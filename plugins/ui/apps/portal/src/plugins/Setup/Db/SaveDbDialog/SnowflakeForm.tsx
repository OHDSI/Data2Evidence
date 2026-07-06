import React, { FC } from "react";
import { TextField } from "@portal/components";
import { useTranslation } from "../../../../contexts";

interface FormData {
  host: string; // Snowflake account identifier
  name: string; // Snowflake database
  warehouse?: string;
  schema?: string;
  role?: string;
  privateKeyPassphrase?: string;
}

interface SnowflakeFormProps {
  data: FormData;
  onChange: (changes: Partial<FormData>) => void;
}

export const SnowflakeForm: FC<SnowflakeFormProps> = ({ data, onChange }) => {
  const { getText, i18nKeys } = useTranslation();
  return (
    <>
      <div style={{ marginBottom: "32px", display: "flex", gap: "32px" }}>
        <TextField
          label={getText(i18nKeys.SNOWFLAKE_FORM__ACCOUNT)}
          variant="standard"
          sx={{ flex: 1 }}
          value={data.host}
          onChange={(event) => onChange({ host: event.target?.value })}
        />
        <TextField
          label={getText(i18nKeys.SNOWFLAKE_FORM__DATABASE)}
          variant="standard"
          sx={{ flex: 1 }}
          value={data.name}
          onChange={(event) => onChange({ name: event.target?.value })}
        />
      </div>
      <div style={{ marginBottom: "32px", display: "flex", gap: "32px" }}>
        <TextField
          label={getText(i18nKeys.SNOWFLAKE_FORM__WAREHOUSE)}
          variant="standard"
          sx={{ flex: 1 }}
          value={data.warehouse || ""}
          onChange={(event) => onChange({ warehouse: event.target?.value })}
        />
        <TextField
          label={getText(i18nKeys.SNOWFLAKE_FORM__SCHEMA)}
          variant="standard"
          sx={{ flex: 1 }}
          value={data.schema || ""}
          onChange={(event) => onChange({ schema: event.target?.value })}
        />
      </div>
      <div style={{ marginBottom: "32px", display: "flex", gap: "32px" }}>
        <TextField
          label={getText(i18nKeys.SNOWFLAKE_FORM__ROLE)}
          variant="standard"
          sx={{ flex: 1 }}
          value={data.role || ""}
          onChange={(event) => onChange({ role: event.target?.value })}
        />
        <TextField
          label={getText(i18nKeys.SNOWFLAKE_FORM__PASSPHRASE)}
          variant="standard"
          type="password"
          sx={{ flex: 1 }}
          value={data.privateKeyPassphrase || ""}
          onChange={(event) => onChange({ privateKeyPassphrase: event.target?.value })}
        />
      </div>
    </>
  );
};
