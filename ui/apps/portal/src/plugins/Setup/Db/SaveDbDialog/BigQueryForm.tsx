import React, { FC } from "react";
import { Box, TextField } from "@portal/components";
import { useTranslation } from "../../../../contexts";

interface FormData {
  host: string;
  name: string;
}

interface BigQueryFormProps {
  data: FormData;
  onChange: (changes: Partial<FormData>) => void;
}

export const BigQueryForm: FC<BigQueryFormProps> = ({ data, onChange }) => {
  const { getText, i18nKeys } = useTranslation();

  return (
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
  );
};
