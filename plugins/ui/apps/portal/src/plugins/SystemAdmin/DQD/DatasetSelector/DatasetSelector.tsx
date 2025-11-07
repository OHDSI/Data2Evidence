import React, { FC, useState } from "react";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import { SelectChangeEvent } from "@mui/material/Select";
import { FormControl, InputLabel } from "@mui/material";
import { useDatasets } from "../../../../hooks";
import { SxProps } from "@mui/system";
import { Study } from "../../../../types";
import { useTranslation } from "../../../../contexts";
interface DatasetSelectorProps {
  handleStudySelect: (study: string, studyId: string) => void;
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

const DatasetSelector: FC<DatasetSelectorProps> = ({ handleStudySelect }) => {
  const { getText, i18nKeys } = useTranslation();
  const [studyId, setStudyId] = useState("");
  const studies = useDatasets("systemAdmin")[0];

  const handleDatasetSelection = (event: SelectChangeEvent) => {
    const studyId = event.target.value;
    const schemaName = studies.find((s) => s.id === studyId)?.schemaName;
    if (schemaName) {
      handleStudySelect(schemaName, studyId);
      setStudyId(studyId);
    }
  };

  return (
    <FormControl sx={styles} size="small">
      <InputLabel id="study-selector-label">{getText(i18nKeys.DATASET_SELECTOR__SELECT_STUDY)}</InputLabel>
      <Select
        labelId="study-selector-label"
        id="study-selector"
        value={studyId}
        onChange={handleDatasetSelection}
        label={getText(i18nKeys.DATASET_SELECTOR__SELECT_STUDY)}
      >
        {studies?.map((dataset: Study) => (
          <MenuItem value={dataset.id} key={dataset.id} sx={styles} disableRipple>
            {dataset.studyDetail?.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default DatasetSelector;
