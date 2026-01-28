import { FormControl } from "@mui/material";
import MenuItem from "@mui/material/MenuItem";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import { SxProps } from "@mui/system";
import { FC, useCallback, useMemo } from "react";
import { useTranslation } from "../../../../contexts";
import { NetworkStrategusStudy } from "../../../../types";

interface ActionSelectorProps {
  study: NetworkStrategusStudy;
  handleRunStrategusStudy: (study: NetworkStrategusStudy) => void;
  handleCleanupStrategusStudy: (study: NetworkStrategusStudy) => void;
  handleManageStrategusResultViewer: (study: NetworkStrategusStudy) => void;
  handleUploadStrategusResults: (study: NetworkStrategusStudy) => void;
  handleDownloadStrategusResults: (study: NetworkStrategusStudy) => void;
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
  handleManageStrategusResultViewer,
  handleUploadStrategusResults,
  handleDownloadStrategusResults,
}) => {
  const { getText, i18nKeys } = useTranslation();

  const actionsList: Action[] = useMemo(
    () => [
      { name: "Run Study", value: "run" },
      { name: "Cleanup Study", value: "cleanup" },
      { name: "Manage Result Viewer", value: "manage" },
      { name: "Upload Strategus Results", value: "upload" },
      { name: "Download Strategus Results", value: "download" },
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
        case "manage":
          handleManageStrategusResultViewer(study);
          break;
        case "upload":
          handleUploadStrategusResults(study);
          break;
        case "download":
          handleDownloadStrategusResults(study);
          break;
        default:
          break;
      }
    },
    [
      study,
      handleRunStrategusStudy,
      handleCleanupStrategusStudy,
      handleManageStrategusResultViewer,
      handleUploadStrategusResults,
      handleDownloadStrategusResults,
    ]
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
