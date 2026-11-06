import { useMemo } from "react";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { IconButton, Menu, type MenuItem } from "ui-react";
import { Study, DatasetType, ActionValue } from "../../../../types";
import { ActionSelectorMap } from "../../../../constant";
import { useTranslation, useUser } from "../../../../contexts";
import { useDataSourceController } from "../useDataSourceController";

interface DataSourceRowMenuProps {
  dataset: Study;
  ctrl: ReturnType<typeof useDataSourceController>;
}

export function DataSourceRowMenu({ dataset, ctrl }: DataSourceRowMenuProps) {
  const { getText, i18nKeys } = useTranslation();
  const { user } = useUser();
  const isUserAdmin = user.isUserAdmin;
  const isSchemaUpdatable = ctrl.checkIfStudyIsUpdatable(dataset);

  const isDisabled = (actionVal: string) => {
    if (actionVal === "update" && !isSchemaUpdatable) return true;
    if (actionVal === "permissions" && !isUserAdmin) return true;
    if (dataset.dialect === "postgres" && actionVal === "release") return true;
    if (actionVal === "create-cache" && dataset.dialect === "hana") return true;
    if (actionVal === "version" && !dataset.schemaName) return true;
    if (actionVal === "refresh-cache" && !dataset.schemaName) return true;
    return false;
  };

  // Two groups separated by a divider: run/operational actions first, then
  // view/manage actions (delete last, in red).
  const operationActions = useMemo(
    (): { value: ActionValue; label: string }[] => [
      { value: "data-quality", label: getText(i18nKeys.ACTION_SELECTOR__RUN_DATA_QUALITY) },
      { value: "data-characterization", label: getText(i18nKeys.ACTION_SELECTOR__RUN_DATA_CHARACTERIZATION) },
      { value: "version", label: getText(i18nKeys.ACTION_SELECTOR__CREATE_DATA_MART) },
      { value: "update", label: getText(i18nKeys.ACTION_SELECTOR__UPDATE_SCHEMA) },
      { value: "release", label: getText(i18nKeys.ACTION_SELECTOR__CREATE_RELEASE) },
      { value: "create-cache", label: getText(i18nKeys.ACTION_SELECTOR__CREATE_CACHE) },
      { value: "refresh-cache", label: getText(i18nKeys.ACTION_SELECTOR__REFRESH_CACHE) },
      { value: "setup-semantic-search", label: getText(i18nKeys.ACTION_SELECTOR__SETUP_SEMANTIC_SEARCH) },
      { value: "transform-to-webapi", label: getText(i18nKeys.ACTION_SELECTOR__TRANSFORM_TO_WEBAPI) },
    ],
    [getText, i18nKeys]
  );

  const manageActions = useMemo(
    (): { value: ActionValue; label: string }[] => [
      { value: "info", label: getText(i18nKeys.ACTION_SELECTOR__SOURCE_INFORMATION) },
      { value: "metadata", label: getText(i18nKeys.ACTION_SELECTOR__UPDATE_DATASET) },
      { value: "permissions", label: getText(i18nKeys.ACTION_SELECTOR__PERMISSIONS) },
      { value: "resources", label: getText(i18nKeys.ACTION_SELECTOR__RESOURCES) },
      { value: "manage-metadata", label: getText(i18nKeys.ACTION_SELECTOR__MANAGE_METADATA) },
      { value: "manage-dashboard", label: getText(i18nKeys.ACTION_SELECTOR__MANAGE_DASHBOARD) },
      { value: "delete", label: getText(i18nKeys.ACTION_SELECTOR__DELETE_DATASET) },
    ],
    [getText, i18nKeys]
  );

  const items: MenuItem[] = useMemo(() => {
    const allowed = ActionSelectorMap[dataset.type as DatasetType] ?? [];
    const toItems = (group: { value: ActionValue; label: string }[]): MenuItem[] =>
      group
        .filter((action) => allowed.includes(action.value))
        .map((action) => ({
          label: action.label,
          value: action.value,
          disabled: isDisabled(action.value),
          danger: action.value === "delete",
        }));
    const operations = toItems(operationActions);
    const manage = toItems(manageActions);
    if (operations.length && manage.length) {
      return [...operations, { value: "__divider", label: "", divider: true }, ...manage];
    }
    return [...operations, ...manage];
  }, [operationActions, manageActions, dataset]);

  const handleSelect = (value: string) => {
    switch (value) {
      case "info":
        return ctrl.handleSourceInformation(dataset);
      case "metadata":
        return ctrl.handleUpdateStudy(dataset);
      case "manage-metadata":
        return ctrl.handleManageMetadata(dataset);
      case "version":
        return ctrl.handleCopyStudy(dataset);
      case "permissions":
        return ctrl.handlePermissions(dataset);
      case "resources":
        return ctrl.handleResources(dataset);
      case "update":
        return ctrl.handleUpdate(dataset);
      case "delete":
        return ctrl.handleDeleteStudy(dataset);
      case "release":
        return ctrl.handleRelease(dataset);
      case "data-quality":
        return ctrl.handleDataQuality(dataset);
      case "data-characterization":
        return ctrl.handleDataCharacterization(dataset);
      case "create-cache":
        return ctrl.handleCreateCache(dataset);
      case "setup-semantic-search":
        return ctrl.handleSetupSemanticSearch(dataset);
      case "manage-dashboard":
        return ctrl.handleManageDashboard(dataset);
      case "transform-to-webapi":
        return ctrl.handleTransformToWebApi(dataset);
      case "refresh-cache":
        return ctrl.handleRefreshCache(dataset);
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

export default DataSourceRowMenu;
