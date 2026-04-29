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
  handleDeleteStrategusStudy: (study: NetworkStrategusStudy) => void;
  handleManageStrategusResultViewer: (study: NetworkStrategusStudy) => void;
  handleUploadStrategusResults: (study: NetworkStrategusStudy) => void;
  handleDownloadStrategusResults: (study: NetworkStrategusStudy) => void;
  handleStudyPermissions: (study: NetworkStrategusStudy) => void;
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
  handleDeleteStrategusStudy,
  handleManageStrategusResultViewer,
  handleUploadStrategusResults,
  handleDownloadStrategusResults,
  handleStudyPermissions,
}) => {
  const { getText, i18nKeys } = useTranslation();

  const actionsList: Action[] = useMemo(
    () => [
      { name: getText(i18nKeys.ACTION_SELECTOR__RUN_STUDY), value: "run" },
      { name: getText(i18nKeys.ACTION_SELECTOR__CLEANUP_STUDY), value: "cleanup" },
      { name: getText(i18nKeys.ACTION_SELECTOR__MANAGE_RESULT_VIEWER), value: "manage" },
      { name: getText(i18nKeys.ACTION_SELECTOR__PERMISSIONS), value: "permissions" },
      { name: getText(i18nKeys.ACTION_SELECTOR__UPLOAD_STRATEGUS_RESULTS), value: "upload" },
      { name: getText(i18nKeys.ACTION_SELECTOR__DOWNLOAD_STRATEGUS_RESULTS), value: "download" },
      { name: getText(i18nKeys.ACTION_SELECTOR__DELETE_STUDY), value: "delete" },
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
        case "permissions":
          handleStudyPermissions(study);
          break;
        case "upload":
          handleUploadStrategusResults(study);
          break;
        case "download":
          handleDownloadStrategusResults(study);
          break;
        case "delete":
          handleDeleteStrategusStudy(study);
          break;
        default:
          break;
      }
    },
    [
      study,
      handleRunStrategusStudy,
      handleCleanupStrategusStudy,
      handleDeleteStrategusStudy,
      handleManageStrategusResultViewer,
      handleUploadStrategusResults,
      handleDownloadStrategusResults,
      handleStudyPermissions,
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
