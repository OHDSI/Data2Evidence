import React, { FC, useCallback, useMemo } from "react";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import { SelectChangeEvent } from "@mui/material/Select";
import { FormControl } from "@mui/material";
import { Study, DatasetType, ActionValue, NetworkStrategusStudy } from "../../../../types";
import { SxProps } from "@mui/system";
import { useTranslation, useUser } from "../../../../contexts";

interface ActionSelectorProps {
  study: NetworkStrategusStudy;
  handleRunStrategusStudy: (study: NetworkStrategusStudy) => void;
  handleCleanupStrategusStudy: (study: NetworkStrategusStudy) => void;
}

interface Action {
  name: string;
  value: string;
}

const styles: SxProps = {
  color: "#000080",
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

const StudyActionSelector: FC<ActionSelectorProps> = ({
  study,
  handleRunStrategusStudy,
  handleCleanupStrategusStudy,
}) => {
  const { getText, i18nKeys } = useTranslation();
  const { user } = useUser();

  const actionsList: Action[] = useMemo(
    () => [
      { name: "Run Study", value: "run" },
      { name: "Cleanup Study", value: "cleanup" },
    ],
    [getText, i18nKeys]
  );

  const handleActionChange = useCallback(
    (event: SelectChangeEvent<string>) => {
      switch (event.target.value) {
        case "run":
          handleRunStrategusStudy(study);
          break;
        case "cleanup":
          handleCleanupStrategusStudy(study);
          break;
        default:
          break;
      }
    },
    [study]
  );

  return (
    <FormControl sx={styles}>
      <Select value="" onChange={handleActionChange} displayEmpty sx={styles}>
        <MenuItem value="" sx={styles} disableRipple>
          {getText(i18nKeys.ACTION_SELECTOR__SELECT_ACTION)}
        </MenuItem>
        {actionsList.map((action: Action) => (
          <MenuItem value={action.value} key={action.value} sx={styles} disableRipple>
            {action.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default StudyActionSelector;
