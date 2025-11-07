import React, { FC } from "react";
import { TextArea, TextField } from "@portal/components";
import { useTranslation } from "../../../../contexts";

interface FormData {
  host: string;
  name: string;
  extra?: string;
}

interface BigQueryFormProps {
  data: FormData;
  onChange: (changes: Partial<FormData>) => void;
  renderExtra?: boolean;
  extraLabel?: string;
}

export const BigQueryForm: FC<BigQueryFormProps> = ({ data, onChange, renderExtra = false, extraLabel }) => {
  const { getText, i18nKeys } = useTranslation();

  return (
    <>
      <div style={{ marginBottom: "32px", display: "flex", gap: "32px" }}>
        <TextField
          label={getText(i18nKeys.BIG_QUERY_FORM__PROJECT)}
          variant="standard"
          sx={{ flex: 1 }}
          value={data.host}
          onChange={(event) => onChange({ host: event.target?.value })}
        />
        <TextField
          label={getText(i18nKeys.BIG_QUERY_FORM__DATASET)}
          variant="standard"
          sx={{ flex: 1 }}
          value={data.name}
          onChange={(event) => onChange({ name: event.target?.value })}
        />
      </div>
      {renderExtra && (
        <div style={{ marginBottom: "32px" }}>
          <div style={{ marginBottom: "16px" }}>
            <b>{extraLabel || getText(i18nKeys.EDIT_DB_DETAILS_DIALOG__EXTRA)}</b>
          </div>
          <div>
            <TextArea
              rows={10}
              value={data.extra || ""}
              onChange={(event) => onChange({ extra: event.target.value })}
            />
          </div>
        </div>
      )}
    </>
  );
};
