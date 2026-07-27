import React, { FC, useContext } from "react";
import { FormControl, MenuItem, Select, SelectChangeEvent, Typography } from "@mui/material";
import { ConceptMappingContext, ConceptMappingDispatchContext } from "../Context/ConceptMappingContext";
import { DispatchType, ACTION_TYPES } from "../Context/reducers";
import { useTranslation } from "../hooks";
import { i18nKeys } from "../Context/state";
import { NOT_APPLICABLE } from "../source/source-adapter";
import { columnMappingType } from "../types";

type LabelKey = keyof typeof i18nKeys;

const REQUIRED_TARGETS: { key: keyof columnMappingType; labelKey: LabelKey }[] = [
  { key: "sourceCode", labelKey: i18nKeys.IMPORT_DIALOG__SOURCE_CODE_COLUMN },
  { key: "sourceName", labelKey: i18nKeys.IMPORT_DIALOG__SOURCE_CODE_NAME },
];
const OPTIONAL_TARGETS: { key: keyof columnMappingType; labelKey: LabelKey }[] = [
  { key: "sourceFrequency", labelKey: i18nKeys.IMPORT_DIALOG__SOURCE_FREQUENCY_COLUMN },
  { key: "description", labelKey: i18nKeys.IMPORT_DIALOG__ADDITIONAL_INFO_COLUMN },
];

export const Step2ColumnMapping: FC = () => {
  const { getText } = useTranslation();
  const state = useContext(ConceptMappingContext);
  const dispatch = useContext<React.Dispatch<DispatchType>>(ConceptMappingDispatchContext);
  const columns = state.wizard.sourceData?.columns ?? [];
  const columnMapping = state.columnMapping;

  const handleChange = (key: keyof columnMappingType, e: SelectChangeEvent<string>) => {
    dispatch({
      type: ACTION_TYPES.SET_COLUMN_MAPPING,
      payload: { ...columnMapping, [key]: e.target.value },
    });
  };

  const renderRow = (target: { key: keyof columnMappingType; labelKey: LabelKey }, withNotApplicable: boolean) => (
    <FormControl component="fieldset" fullWidth key={target.key} sx={{ mb: 2 }}>
      <Typography sx={{ fontWeight: 500, mb: 0.5 }}>{getText(target.labelKey)}</Typography>
      <Select value={(columnMapping[target.key] as string) ?? ""} onChange={(e) => handleChange(target.key, e)} fullWidth>
        {withNotApplicable && (
          <MenuItem value={NOT_APPLICABLE}>{getText(i18nKeys.COLUMN_MAPPING__NOT_APPLICABLE)}</MenuItem>
        )}
        {columns.map((c) => (
          <MenuItem value={c} key={c}>
            {c}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  return (
    <div className="concept-mapping__step2">
      <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 2 }}>
        {getText(i18nKeys.IMPORT_DIALOG__COLUMN_MAPPING)}
      </Typography>
      {REQUIRED_TARGETS.map((t) => renderRow(t, false))}
      {OPTIONAL_TARGETS.map((t) => renderRow(t, true))}
    </div>
  );
};
