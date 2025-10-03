import React, { FC } from "react";
import { Box, TextArea, TextField } from "@portal/components";
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
      <Box mb={4} display="flex" gap={4}>
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
      </Box>
      {renderExtra && (
        <Box mb={4}>
          <Box mb={2}>
            <b>{extraLabel || getText(i18nKeys.EDIT_DB_DETAILS_DIALOG__EXTRA)}</b>
          </Box>
          <Box>
            <TextArea
              rows={10}
              value={data.extra || ""}
              onChange={(event) => onChange({ extra: event.target.value })}
            />
          </Box>
        </Box>
      )}
    </>
  );
};
