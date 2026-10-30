import { useMemo } from "react";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { IconButton, Menu, type MenuItem } from "ui-react";
import { NetworkStrategusStudy } from "../../../../types";
import { useTranslation } from "../../../../contexts";
import { useDataSourceController } from "../useDataSourceController";

interface StudyRowMenuProps {
  study: NetworkStrategusStudy;
  ctrl: ReturnType<typeof useDataSourceController>;
}

export function StudyRowMenu({ study, ctrl }: StudyRowMenuProps) {
  const { getText, i18nKeys } = useTranslation();

  const items: MenuItem[] = useMemo(
    () => [
      { value: "run", label: getText(i18nKeys.ACTION_SELECTOR__RUN_STUDY) },
      { value: "cleanup", label: getText(i18nKeys.ACTION_SELECTOR__CLEANUP_STUDY) },
      { value: "manage", label: getText(i18nKeys.ACTION_SELECTOR__MANAGE_RESULT_VIEWER) },
      { value: "permissions", label: getText(i18nKeys.ACTION_SELECTOR__PERMISSIONS) },
      { value: "upload", label: getText(i18nKeys.ACTION_SELECTOR__UPLOAD_STRATEGUS_RESULTS) },
      { value: "download", label: getText(i18nKeys.ACTION_SELECTOR__DOWNLOAD_STRATEGUS_RESULTS) },
      { value: "delete", label: getText(i18nKeys.ACTION_SELECTOR__DELETE_STUDY), danger: true },
    ],
    [getText, i18nKeys]
  );

  const handleSelect = (value: string) => {
    switch (value) {
      case "run":
        return ctrl.handleRunStrategusStudy(study);
      case "cleanup":
        return ctrl.handleCleanupStrategusStudy(study);
      case "manage":
        return ctrl.handleManageStrategusResultViewer(study);
      case "permissions":
        return ctrl.handleStrategusStudyPermissions(study);
      case "upload":
        return ctrl.handleUploadStrategusResults(study);
      case "download":
        return ctrl.handleDownloadStrategusResults(study);
      case "delete":
        return ctrl.handleDeleteStrategusStudy(study);
      default:
        return undefined;
    }
  };

  return (
    <Menu
      items={items}
      width={260}
      onSelect={handleSelect}
      activator={({ open }) => (
        <IconButton
          category="no-stroke"
          icon={<MoreVertIcon />}
          ariaLabel={getText(i18nKeys.STUDY_OVERVIEW__ACTIONS)}
          onClick={open}
        />
      )}
    />
  );
}

export default StudyRowMenu;
