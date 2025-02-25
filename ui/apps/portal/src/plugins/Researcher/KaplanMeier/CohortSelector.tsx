import React, { FC, useState } from "react";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import { SelectChangeEvent } from "@mui/material/Select";
import { FormControl, InputLabel } from "@mui/material";
import { useDatasets } from "../../../hooks";
import { SxProps } from "@mui/system";
import { CohortMapping, Study } from "../../../types";
import { useTranslation } from "../../../contexts";
interface CohortSelectorProps {
  cohortTableName: string;
  cohortList: CohortMapping[];
  cohortId: number | null;
  setCohortId: (cohortId: number) => void;
  disabled: boolean;
}

const styles: SxProps = {
  color: "#000080",
  minWidth: 220,
  ".MuiInputLabel-root": {
    color: "#000080",
    "&.MuiInputLabel-shrink, &.Mui-focused": {
      color: "var(--color-neutral)",
    },
  },
  ".MuiInput-input:focus": {
    backgroundColor: "transparent",
    color: "#000080",
  },
  ".MuiInput-root": {
    "&::after, &:hover:not(.Mui-disabled)::before": {
      borderBottom: "2px solid #000080",
    },
  },
  "&.MuiMenuItem-root:hover": {
    backgroundColor: "#ebf2fa",
  },
};

const CohortSelector: FC<CohortSelectorProps> = ({ cohortTableName, cohortList, cohortId, setCohortId, disabled }) => {
  const { getText, i18nKeys } = useTranslation();

  const handleCohortSelection = (event: SelectChangeEvent) => {
    const cohortId = event.target.value;
    setCohortId(Number(cohortId));
  };

  return (
    <FormControl sx={styles} size="small" disabled={disabled}>
      <InputLabel id="study-selector-label">{cohortTableName}</InputLabel>
      <Select
        labelId="study-selector-label"
        id="study-selector"
        value={cohortId === null ? "" : String(cohortId)}
        onChange={handleCohortSelection}
        label={getText(i18nKeys.DATASET_SELECTOR__SELECT_STUDY)}
      >
        {cohortList.map((cohort: CohortMapping) => (
          <MenuItem value={cohort.id} key={cohort.id} sx={styles} disableRipple>
            {cohort.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default CohortSelector;
