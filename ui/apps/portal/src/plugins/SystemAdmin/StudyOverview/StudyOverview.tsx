import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import IconButton from "@mui/material/IconButton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import { Button, Loader, TableCell, TableRow, Text, Tooltip } from "@portal/components";
import React, { FC, useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../../axios/api";
import { useTranslation } from "../../../contexts";
import { useDatabases, useDatasets, useDialogHelper } from "../../../hooks";
import { CloseDialogType, NetworkStrategusStudy, Study, StudyAttribute } from "../../../types";
import { JobRunTypes } from "../DQD/types";
import ActionSelector from "./ActionSelector/ActionSelector";
import StudyActionSelector from "./ActionSelector/StudyActionSelector";
import AddStrategusStudyDialog from "./AddStrategusStudyDialog/AddStrategusStudyDialog";
import AddStudyDialog from "./AddStudyDialog/AddStudyDialog";
import AnalysisDialog from "./AnalysisDialog/AnalysisDialog";
import CleanupStrategusStudyDialog from "./CleanupStrategusStudyDialog/CleanupStrategusStudyDialog";
import CopyStudyDialog from "./CopyStudyDialog/CopyStudyDialog";
import CreateCacheDialog from "./CreateCacheDialog/CreateCacheDialog";
import CreateReleaseDialog from "./CreateReleaseDialog/CreateReleaseDialog";
import DatasetResourcesDialog from "./DatasetResourcesDialog/DatasetResourcesDialog";
import DeleteStudyDialog from "./DeleteStudyDialog/DeleteStudyDialog";
import PermissionsDialog from "./PermissionsDialog/PermissionsDialog";
import RunStrategusStudyDialog from "./RunStrategusStudyDialog/RunStrategusStudyDialog";
import SetupSemanticSearchDialog from "./SetupSemanticSearchDialog/SetupSemanticSearchDialog";
import SourceInformationDialog from "./SourceInformationDialog/SourceInformationDialog";
import UpdateSchemaDialog from "./UpdateSchemaDialog/UpdateSchemaDialog";
import UpdateStudyDialog from "./UpdateStudyDialog/UpdateStudyDialog";
import UploadStrategusResultsDialog from "./UploadStrategusResultsDialog/UploadStrategusResultsDialog";
import ManageViewerDialog from "./ManageViewerDialog/ManageViewerDialog";

import "./StudyOverview.scss";

const enum StudyAttributeConfigIds {
  LATEST_SCHEMA_VERSION = "latest_schema_version",
  SCHEMA_VERSION = "schema_version",
}
const MISSING_ATTRIBUTE_ERROR = "Not Available";

const StudyOverview: FC = () => {
  const { getText, i18nKeys } = useTranslation();
  const [refetch, setRefetch] = useState(0);
  const [fetchUpdatesLoading, setFetchUpdatesLoading] = useState(false);
  const [datasets, loadingDatasets, error] = useDatasets("systemAdmin", undefined, undefined, refetch);
  const [databases] = useDatabases();

  const getDbDialect = useCallback(
    (dbName: string) => {
      const currDb = databases.find((db) => db.code === dbName);
      return currDb ? currDb.dialect : "";
    },
    [databases]
  );

  const [showAddStudyDialog, openAddStudyDialog, closeAddStudyDialog] = useDialogHelper(false);
  const [showUpdateStudyDialog, openUpdateStudyDialog, closeUpdateStudyDialog] = useDialogHelper(false);
  const [showResourcesDialog, openResourcesDialog, closeResourcesDialog] = useDialogHelper(false);
  const [showCopyStudyDialog, openCopyStudyDialog, closeCopyStudyDialog] = useDialogHelper(false);
  const [showDeleteStudyDialog, openDeleteStudyDialog, closeDeleteStudyDialog] = useDialogHelper(false);
  const [showPermissionsDialog, openPermissionsDialog, closePermissionsDialog] = useDialogHelper(false);
  const [showUpdateDialog, openUpdateDialog, closeUpdateDialog] = useDialogHelper(false);
  const [showReleaseDialog, openReleaseDialog, closeReleaseDialog] = useDialogHelper(false);
  const [showDataQualityDialog, openDataQualityDialog, closeDataQualityDialog] = useDialogHelper(false);
  const [showDataCharacterizationDialog, openDataCharacterizationDialog, closeDataCharacterizationDialog] =
    useDialogHelper(false);
  const [showCreateCacheDialog, openCreateCacheDialog, closeCreateCacheDialog] = useDialogHelper(false);
  const [showSetupSemanticSearchDialog, openSetupSemanticSearchDialog, closeSetupSemanticSearchDialog] =
    useDialogHelper(false);
  const [showSourceInformationDialog, openSourceInformationDialog, closeSourceInformationDialog] =
    useDialogHelper(false);
  const [showManageViewerDialog, openManageViewerDialog, closeManageViewerDialog] = useDialogHelper(false);
  const [viewerDialogType, setViewerDialogType] = useState<"dashboard" | "strategus">("dashboard");
  const [showAddStrategusStudyDialog, openAddStrategusStudyDialog, closeAddStrategusStudyDialog] =
    useDialogHelper(false);
  const [showRunStrategusStudyDialog, openRunStrategusStudyDialog, closeRunStrategusStudyDialog] =
    useDialogHelper(false);
  const [showCleanupStrategusStudyDialog, openCleanupStrategusStudyDialog, closeCleanupStrategusStudyDialog] =
    useDialogHelper(false);
  const [showUploadStrategusResultsDialog, openUploadStrategusResultsDialog, closeUploadStrategusResultsDialog] =
    useDialogHelper(false);

  const [activeDataset, setActiveDataset] = useState<Study>();
  const [activeStrategusStudy, setActiveStrategusStudy] = useState<NetworkStrategusStudy>();
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [strategusStudies, setStrategusStudies] = useState<NetworkStrategusStudy[]>([]);
  const [loadingStrategusStudies, setLoadingStrategusStudies] = useState(false);

  const handleSourceInformation = useCallback(
    (dataset: Study) => {
      setActiveDataset(dataset);
      openSourceInformationDialog();
    },
    [openSourceInformationDialog]
  );

  const handleUpdateStudy = useCallback(
    (dataset: Study) => {
      setActiveDataset(dataset);
      openUpdateStudyDialog();
    },
    [openUpdateStudyDialog]
  );

  const handleResources = useCallback(
    (dataset: Study) => {
      setActiveDataset(dataset);
      openResourcesDialog();
    },
    [openResourcesDialog]
  );

  const handleCopyStudy = useCallback(
    (dataset: Study) => {
      setActiveDataset(dataset);
      openCopyStudyDialog();
    },
    [openCopyStudyDialog]
  );

  const handleDeleteStudy = useCallback(
    (dataset: Study) => {
      setActiveDataset(dataset);
      openDeleteStudyDialog();
    },
    [openDeleteStudyDialog]
  );

  const handlePermissions = useCallback(
    (dataset: Study) => {
      setActiveDataset(dataset);
      openPermissionsDialog();
    },
    [openPermissionsDialog]
  );

  const handleRelease = useCallback(
    (dataset: Study) => {
      dataset.dialect = getDbDialect(dataset.databaseCode);
      setActiveDataset(dataset);
      openReleaseDialog();
    },
    [getDbDialect, openReleaseDialog]
  );

  const handleUpdate = useCallback(
    (dataset: Study) => {
      dataset.dialect = getDbDialect(dataset.databaseCode);
      setActiveDataset(dataset);
      openUpdateDialog();
    },
    [getDbDialect, openUpdateDialog]
  );

  const handleDataQuality = useCallback(
    (dataset: Study) => {
      dataset.dialect = getDbDialect(dataset.databaseCode);
      setActiveDataset(dataset);
      openDataQualityDialog();
    },
    [getDbDialect, openDataQualityDialog]
  );

  const handleDataCharacterization = useCallback(
    (dataset: Study) => {
      dataset.dialect = getDbDialect(dataset.databaseCode);
      setActiveDataset(dataset);
      openDataCharacterizationDialog();
    },
    [getDbDialect, openDataCharacterizationDialog]
  );

  const handleCreateCache = useCallback(
    (dataset: Study) => {
      setActiveDataset(dataset);
      openCreateCacheDialog();
    },
    [openCreateCacheDialog]
  );

  const handleSetupSemanticSearch = useCallback(
    (dataset: Study) => {
      setActiveDataset(dataset);
      openSetupSemanticSearchDialog();
    },
    [openSetupSemanticSearchDialog]
  );

  const handleManageDashboard = useCallback(
    (dataset: Study) => {
      setActiveDataset(dataset);
      setViewerDialogType("dashboard");
      openManageViewerDialog();
    },
    [openManageViewerDialog]
  );

  const handleRunStrategusStudy = useCallback(
    (study: NetworkStrategusStudy) => {
      setActiveStrategusStudy(study);
      openRunStrategusStudyDialog();
    },
    [openRunStrategusStudyDialog]
  );

  const handleCleanupStrategusStudy = useCallback(
    (study: NetworkStrategusStudy) => {
      setActiveStrategusStudy(study);
      openCleanupStrategusStudyDialog();
    },
    [openCleanupStrategusStudyDialog]
  );

  const handleManageStrategusResultViewer = useCallback(
    (study: NetworkStrategusStudy) => {
      setActiveStrategusStudy(study);
      setViewerDialogType("strategus");
      openManageViewerDialog();
    },
    [openManageViewerDialog]
  );

  const handleStrategusStudyPermissions = useCallback(
    (study: NetworkStrategusStudy) => {
      // study.datasetId is the strategus_analysis dataset's ID — find it from the full datasets list
      const dataset = datasets?.find((d: Study) => d.id === study.datasetId);
      setActiveDataset(dataset);
      openPermissionsDialog();
    },
    [datasets, openPermissionsDialog]
  );

  const handleUploadStrategusResults = useCallback(
    (study: NetworkStrategusStudy) => {
      setActiveStrategusStudy(study);
      openUploadStrategusResultsDialog();
    },
    [openUploadStrategusResultsDialog]
  );

  const handleDownloadStrategusResults = useCallback(async (study: NetworkStrategusStudy) => {
    try {
      const filesList = await api.strategusResults.listStrategusResultsFiles(study.studyId);

      if (!filesList || filesList.length === 0) {
        console.error(`No results file found for study ${study.studyId}`);
        return;
      }

      const latestFile = filesList[0];
      const fileName = latestFile.name.split("/").pop();

      const response = await api.strategusResults.downloadStrategusResultsFile(study.studyId, fileName);

      if (response.signedUrl) {
        window.open(response.signedUrl, "_blank");
      } else if (response.data) {
        const byteCharacters = atob(response.data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "application/zip" });

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName || `${study.studyId}_results.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (error: any) {
      console.error("Download error:", error);
    }
  }, []);

  const toggleRow = useCallback((datasetId: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [datasetId]: !prev[datasetId],
    }));
  }, []);

  // Fetch strategus analysis data and merge with strategus_analysis datasets
  useEffect(() => {
    const fetchStrategusStudies = async () => {
      if (!datasets) return;
      
      setLoadingStrategusStudies(true);
      try {
        const studies = await api.strategusAnalysis.getAllStrategusAnalysis();
        setStrategusStudies(studies);
      } catch (error) {
        console.error("Error fetching strategus studies:", error);
        setStrategusStudies([]);
      } finally {
        setLoadingStrategusStudies(false);
      }
    };

    fetchStrategusStudies();
  }, [refetch, datasets]);

  // Organize datasets into parent-child structure for source/omop/hana and fhir, and separate lists for studies and strategus_analysis
  const { sourceOmopHanaDatasets, studyDatasets, fhirDatasets, strategusAnalysisDatasets } = useMemo(() => {
    if (!datasets) return { sourceOmopHanaDatasets: [], studyDatasets: [], fhirDatasets: [], strategusAnalysisDatasets: [] };

    const sourceOmopHana: Study[] = [];
    const studies: Study[] = [];
    const fhir: Study[] = [];
    const strategusAnalysis: Study[] = [];
    const cdmChildrenMap = new Map<string, Study[]>();
    const fhirChildrenMap = new Map<string, Study[]>();

    // First pass: separate datasets by type and build children maps
    datasets.forEach((dataset: Study) => {
      const type = dataset.type?.toLowerCase();

      if (type === "study") {
        // Only study type datasets go to studies table
        studies.push(dataset);
      } else if (type === "strategus_analysis") {
        // Strategus analysis datasets
        strategusAnalysis.push(dataset);
      } else if (type === "fhir" || type === "non_omop") {
        // FHIR and non_omop datasets go to FHIR table
        // Check if this is a child dataset (has source_dataset_id attribute)
        const sourceIdAttribute = dataset.attributes?.find((attr) => attr.attributeId === "source_dataset_id");

        if (sourceIdAttribute && sourceIdAttribute.value) {
          // This is a child dataset
          const parentId = sourceIdAttribute.value;
          if (!fhirChildrenMap.has(parentId)) {
            fhirChildrenMap.set(parentId, []);
          }
          fhirChildrenMap.get(parentId)!.push(dataset);
        } else {
          // This is a parent or standalone FHIR dataset
          fhir.push(dataset);
        }
      } else if (type === "source" || type === "omop" || type === "hana__omop" || type === "hana__non_omop") {
        // Source, OMOP, and all HANA datasets (hana__omop, hana__non_omop, etc.)
        // Check if this is a child dataset (has source_dataset_id attribute)
        const sourceIdAttribute = dataset.attributes?.find((attr) => attr.attributeId === "source_dataset_id");

        if (sourceIdAttribute && sourceIdAttribute.value) {
          // This is a child dataset
          const parentId = sourceIdAttribute.value;
          if (!cdmChildrenMap.has(parentId)) {
            cdmChildrenMap.set(parentId, []);
          }
          cdmChildrenMap.get(parentId)!.push(dataset);
        } else {
          // This is a parent or standalone dataset (hana datasets won't have children)
          sourceOmopHana.push(dataset);
        }
      }
    });

    const cdmDatasetsWithChildren = sourceOmopHana.map((dataset) => ({
      ...dataset,
      children: cdmChildrenMap.get(dataset.id) || [],
    }));

    const fhirDatasetsWithChildren = fhir.map((dataset) => ({
      ...dataset,
      children: fhirChildrenMap.get(dataset.id) || [],
    }));

    // Merge strategusStudies into strategusAnalysisDatasets
    // TODO: Consider pre-indexing strategusStudies by datasetId for better performance if datasets list is large
    const strategusAnalysisWithData = strategusAnalysis.map((dataset) => {
      const matchingStudy = strategusStudies.find((study) => study.datasetId === dataset.id);
      return {
        ...dataset,
        strategusAnalysis: matchingStudy || null,
      };
    });

    return {
      sourceOmopHanaDatasets: cdmDatasetsWithChildren,
      studyDatasets: studies,
      fhirDatasets: fhirDatasetsWithChildren,
      strategusAnalysisDatasets: strategusAnalysisWithData,
    };
  }, [datasets, strategusStudies]);

  // Initialize expandedRows to have all parent datasets expanded by default
  useEffect(() => {
    const initialExpandedRows: Record<string, boolean> = {};

    // Add CDM datasets with children
    if (sourceOmopHanaDatasets.length > 0) {
      sourceOmopHanaDatasets.forEach((dataset) => {
        if (dataset.children && dataset.children.length > 0) {
          initialExpandedRows[dataset.id] = true;
        }
      });
    }

    // Add FHIR datasets with children
    if (fhirDatasets.length > 0) {
      fhirDatasets.forEach((dataset) => {
        if (dataset.children && dataset.children.length > 0) {
          initialExpandedRows[dataset.id] = true;
        }
      });
    }

    if (Object.keys(initialExpandedRows).length > 0) {
      setExpandedRows((prev) => {
        // Only update if there are new parent datasets to expand
        // Preserve existing expanded state for datasets that are already in prev
        const merged = { ...prev };
        Object.keys(initialExpandedRows).forEach((id) => {
          if (!(id in merged)) {
            merged[id] = true;
          }
        });
        return merged;
      });
    }
  }, [sourceOmopHanaDatasets, fhirDatasets]);

  const handleCloseAddStudyDialog = useCallback(
    (type: CloseDialogType) => {
      closeAddStudyDialog();
      if (type === "success") {
        setRefetch((refetch) => refetch + 1);
      }
    },
    [closeAddStudyDialog]
  );

  const handleCloseUpdateStudyDialog = useCallback(
    (type: CloseDialogType) => {
      closeUpdateStudyDialog();
      if (type === "success") {
        setRefetch((refetch) => refetch + 1);
      }
    },
    [closeUpdateStudyDialog]
  );

  const handleCloseCopyStudyDialog = useCallback(
    (type: CloseDialogType) => {
      closeCopyStudyDialog();
      if (type === "success") {
        setRefetch((refetch) => refetch + 1);
      }
    },
    [closeCopyStudyDialog]
  );

  const handleCloseDeleteStudyDialog = useCallback(
    (type: CloseDialogType) => {
      closeDeleteStudyDialog();
      if (type === "success") {
        setRefetch((refetch) => refetch + 1);
      }
    },
    [closeDeleteStudyDialog]
  );

  const handleCloseAddStrategusStudyDialog = useCallback(
    (success?: boolean) => {
      closeAddStrategusStudyDialog();
      if (success) {
        setRefetch((refetch) => refetch + 1);
      }
    },
    [closeAddStrategusStudyDialog]
  );

  const fetchDatamodelUpdates = useCallback(async () => {
    setFetchUpdatesLoading(true);
    const datasetsByFlow: Record<string, Study[]> = {};
    const apiRequests = [];

    const sourceDatasets: Study[] = [];
    const cacheDatasets: Study[] = [];

    datasets.forEach((item: Study) => {
      const flowName = item.plugin;

      // Skip datasets with null plugin, custom-flow, or FHIR datasets
      if (!flowName || flowName === "custom-flow" || item.type === "fhir" || item.type === "non_omop") return;

      // Check if this is a cache/datamart dataset (has source_dataset_id attribute)
      const hasSourceDatasetId = item.attributes?.some((attribute) => attribute.attributeId === "source_dataset_id");

      if (hasSourceDatasetId) {
        cacheDatasets.push(item);
      } else if (item.type === "source" || item.type === "hana__omop" || item.type === "hana__non_omop") {
        if (!datasetsByFlow[flowName]) {
          datasetsByFlow[flowName] = [];
        }
        datasetsByFlow[flowName].push(item);
        sourceDatasets.push(item);
      }
    });

    // Create get_version_info flow runs for source datasets grouped by plugin
    for (const flow in datasetsByFlow) {
      apiRequests.push(
        api.dataflow.createGetVersionInfoFlowRun({
          flowRunName: `${flow}-get_version_info`,
          options: {
            options: {
              flow_action_type: "get_version_info",
              token: "",
              database_code: "",
              data_model: "",
              plugin: flow,
              datasets: datasetsByFlow[flow],
            },
          },
        })
      );
    }

    // Create get_version_info flow run for cache datasets
    if (cacheDatasets.length > 0) {
      apiRequests.push(
        api.dataflow.createGetVersionInfoFlowRun({
          flowRunName: "cache-get_version_info",
          options: {
            options: {
              flowActionType: "get_version_info",
              token: "",
              database_code: "",
              data_model: "",
              plugin: "create_cachedb_file_plugin",
              datasets: cacheDatasets,
            },
          },
        })
      );
    }

    try {
      await Promise.all(apiRequests);
    } catch (error) {
      console.error(error);
    } finally {
      setFetchUpdatesLoading(false);
    }
  }, [setFetchUpdatesLoading, datasets]);

  const getAttributeValue = (
    attributes: StudyAttribute[] | undefined,
    attributeConfigId: StudyAttributeConfigIds
  ): string => {
    if (!attributes) {
      return MISSING_ATTRIBUTE_ERROR;
    }
    const latestSchemaVersionAttribute = attributes.find((attribute: StudyAttribute) => {
      return attribute.attributeId === attributeConfigId;
    });
    if (latestSchemaVersionAttribute) {
      return latestSchemaVersionAttribute.value;
    } else {
      return MISSING_ATTRIBUTE_ERROR;
    }
  };

  const checkIfStudyIsUpdatable = (dataset: Study): boolean => {
    // If schema version and
    const currentSchemaVersion = getAttributeValue(dataset.attributes, StudyAttributeConfigIds.SCHEMA_VERSION);
    const latestSchemaVersion = getAttributeValue(dataset.attributes, StudyAttributeConfigIds.LATEST_SCHEMA_VERSION);

    // If current versions or latest verison attribute is missing, return false
    if (currentSchemaVersion === MISSING_ATTRIBUTE_ERROR || latestSchemaVersion === MISSING_ATTRIBUTE_ERROR) {
      return false;
    }

    return currentSchemaVersion !== latestSchemaVersion;
  };

  const renderDatasetRow = (dataset: Study, isChild = false, hasChildren = false) => {
    const getCellClassName = () => {
      if (isChild) return "icon-cell icon-cell--child";
      if (hasChildren) return "icon-cell icon-cell--parent";
      return "icon-cell icon-cell--no-children";
    };

    return (
      <TableRow key={dataset.id}>
        <TableCell className={getCellClassName()}>
          {!isChild && hasChildren && (
            <IconButton
              aria-label="expand row"
              size="small"
              onClick={() => toggleRow(dataset.id)}
              className="expand-icon-button"
            >
              {expandedRows[dataset.id] ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />}
            </IconButton>
          )}
        </TableCell>
        <TableCell style={{ maxWidth: "120px" }}>
          <Text textFormat="wrap" showCopy textStyle={{ paddingTop: "5px" }}>
            {dataset.id}
          </Text>
        </TableCell>
        <TableCell>
          {dataset.studyDetail?.name ? dataset.studyDetail.name : getText(i18nKeys.STUDY_OVERVIEW__UNTITLED)}
        </TableCell>
        <TableCell style={{ maxWidth: "120px" }}>
          <Text textFormat="wrap" {...(dataset.schemaName && { showCopy: true })} textStyle={{ paddingTop: "5px" }}>
            {dataset.schemaName || "-"}
          </Text>
          {dataset.vocabSchemaName && dataset.schemaName !== dataset.vocabSchemaName && (
            <Text textFormat="wrap" textStyle={{ paddingTop: "5px" }}>
              {dataset.vocabSchemaName}
            </Text>
          )}
        </TableCell>
        <TableCell style={{ maxWidth: "120px" }}>
          {getAttributeValue(dataset.attributes, StudyAttributeConfigIds.SCHEMA_VERSION)}
        </TableCell>
        <TableCell>{getAttributeValue(dataset.attributes, StudyAttributeConfigIds.LATEST_SCHEMA_VERSION)}</TableCell>
        <TableCell>
          {dataset.dataModel
            ? `${dataset.dataModel} [${dataset.plugin}]`
            : dataset.fhir_project_id && (
                <Tooltip placement="top" title={dataset.fhir_project_id}>
                  <span>{getText(i18nKeys.STUDY_OVERVIEW__FHIR_SERVER)}</span>
                </Tooltip>
              )}
        </TableCell>
        <TableCell>{dataset.type}</TableCell>
        <TableCell className="col-action">
          <ActionSelector
            dataset={dataset}
            isSchemaUpdatable={checkIfStudyIsUpdatable(dataset)}
            handleSourceInformation={handleSourceInformation}
            handleDeleteStudy={handleDeleteStudy}
            handleCopyStudy={handleCopyStudy}
            handleMetadata={handleUpdateStudy}
            handleResources={handleResources}
            handlePermissions={handlePermissions}
            handleUpdate={handleUpdate}
            handleRelease={handleRelease}
            handleDataQuality={handleDataQuality}
            handleDataCharacterization={handleDataCharacterization}
            handleCreateCache={handleCreateCache}
            handleSetupSemanticSearch={handleSetupSemanticSearch}
            handleManageDashboard={handleManageDashboard}
          />
        </TableCell>
      </TableRow>
    );
  };

  if (error) console.error(error.message);
  if (loadingDatasets) return <Loader />;

  return (
    <div className="studyoverview__container">
      <div className="studyoverview">
        <div className="studyoverview__actions">
          <h3 className="studyoverview__actions-title">{getText(i18nKeys.STUDY_OVERVIEW__DATASETS)}</h3>
          <div className="studyoverview__actions-btn-container">
            <Button
              text={getText(i18nKeys.STUDY_OVERVIEW__UPDATE_DATASET_METADATA)}
              onClick={fetchDatamodelUpdates}
              loading={fetchUpdatesLoading}
            />
            <Button text={getText(i18nKeys.STUDY_OVERVIEW__ADD_DATASET)} onClick={openAddStudyDialog} />
          </div>
          <AddStudyDialog
            open={showAddStudyDialog}
            onClose={handleCloseAddStudyDialog}
            loading={loading}
            setLoading={setLoading}
            studies={datasets}
            databases={databases}
          />
        </div>

        <div className="studyoverview__content">
          {sourceOmopHanaDatasets.length > 0 && (
            <>
              <h4 className="dataset-section-title">{getText(i18nKeys.STUDY_OVERVIEW__CDM_DATASETS)}</h4>
              <TableContainer className="studyoverview__list">
                <Table>
                  <colgroup>
                    <col style={{ width: "1%" }} />
                    <col />
                    <col />
                    <col />
                    <col />
                    <col />
                    <col />
                    <col />
                  </colgroup>
                  <TableHead>
                    <TableRow>
                      <TableCell></TableCell>
                      <TableCell>{getText(i18nKeys.STUDY_OVERVIEW__DATASET_ID)}</TableCell>
                      <TableCell>{getText(i18nKeys.STUDY_OVERVIEW__NAME)}</TableCell>
                      <TableCell>{getText(i18nKeys.STUDY_OVERVIEW__SCHEMA_NAME)}</TableCell>
                      <TableCell>{getText(i18nKeys.STUDY_OVERVIEW__SCHEMA_VERSION)}</TableCell>
                      <TableCell>{getText(i18nKeys.STUDY_OVERVIEW__LATEST_AVAILABLE)}</TableCell>
                      <TableCell>{getText(i18nKeys.STUDY_OVERVIEW__DATA_MODEL)}</TableCell>
                      <TableCell>{getText(i18nKeys.STUDY_OVERVIEW__TYPE)}</TableCell>
                      <TableCell>{getText(i18nKeys.STUDY_OVERVIEW__ACTIONS)}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sourceOmopHanaDatasets.map((dataset: Study & { children?: Study[] }, index: number) => (
                      <React.Fragment key={dataset.id}>
                        {renderDatasetRow(dataset, false, (dataset.children?.length || 0) > 0)}
                        {dataset.children && dataset.children.length > 0 && expandedRows[dataset.id] && (
                          <>
                            <TableRow className="cache-datasets-header-row">
                              <TableCell colSpan={9} className="cache-datasets-header-cell">
                                Cache Datasets
                              </TableCell>
                            </TableRow>
                            {dataset.children.map((child: Study) => renderDatasetRow(child, true, false))}
                            {index < sourceOmopHanaDatasets.length - 1 && (
                              <TableRow className="dataset-separator-row">
                                <TableCell colSpan={9} className="dataset-separator-cell" />
                              </TableRow>
                            )}
                          </>
                        )}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}

          {/* FHIR Datasets Table */}
          {fhirDatasets.length > 0 && (
            <>
              <h4 className="dataset-section-title dataset-section-title--secondary">
                {getText(i18nKeys.STUDY_OVERVIEW__FHIR_DATASETS)}
              </h4>
              <TableContainer className="studyoverview__list">
                <Table>
                  <colgroup>
                    <col style={{ width: "1%" }} />
                    <col />
                    <col />
                    <col />
                    <col />
                    <col />
                    <col />
                    <col />
                  </colgroup>
                  <TableHead>
                    <TableRow>
                      <TableCell></TableCell>
                      <TableCell>{getText(i18nKeys.STUDY_OVERVIEW__DATASET_ID)}</TableCell>
                      <TableCell>{getText(i18nKeys.STUDY_OVERVIEW__NAME)}</TableCell>
                      <TableCell>{getText(i18nKeys.STUDY_OVERVIEW__SCHEMA_NAME)}</TableCell>
                      <TableCell>{getText(i18nKeys.STUDY_OVERVIEW__SCHEMA_VERSION)}</TableCell>
                      <TableCell>{getText(i18nKeys.STUDY_OVERVIEW__LATEST_AVAILABLE)}</TableCell>
                      <TableCell>{getText(i18nKeys.STUDY_OVERVIEW__DATA_MODEL)}</TableCell>
                      <TableCell>{getText(i18nKeys.STUDY_OVERVIEW__TYPE)}</TableCell>
                      <TableCell>{getText(i18nKeys.STUDY_OVERVIEW__ACTIONS)}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {fhirDatasets.map((dataset: Study & { children?: Study[] }, index: number) => (
                      <React.Fragment key={dataset.id}>
                        {renderDatasetRow(dataset, false, (dataset.children?.length || 0) > 0)}
                        {dataset.children && dataset.children.length > 0 && expandedRows[dataset.id] && (
                          <>
                            <TableRow className="cache-datasets-header-row">
                              <TableCell colSpan={9} className="cache-datasets-header-cell">
                                Cache Datasets
                              </TableCell>
                            </TableRow>
                            {dataset.children.map((child: Study) => renderDatasetRow(child, true, false))}
                            {index < fhirDatasets.length - 1 && (
                              <TableRow className="dataset-separator-row">
                                <TableCell colSpan={9} className="dataset-separator-cell" />
                              </TableRow>
                            )}
                          </>
                        )}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}

          {/* Studies Table */}
          <>
            <div className="section-header-with-action" style={{ marginTop: "2em" }}>
              <h4 className="dataset-section-title" style={{ margin: 0 }}>
                {getText(i18nKeys.STUDY_OVERVIEW__STUDIES)}
              </h4>
              <Button text="Add Study" onClick={openAddStrategusStudyDialog} />
            </div>
            {loadingStrategusStudies ? (
              <TableContainer className="studyoverview__list">
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Loader />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            ) : strategusAnalysisDatasets.length > 0 ? (
              <TableContainer className="studyoverview__list">
                <Table>
                  <colgroup>
                    <col style={{ width: "1%" }} />
                    <col />
                    <col />
                    <col />
                    <col />
                    <col />
                  </colgroup>
                  <TableHead>
                    <TableRow>
                      <TableCell></TableCell>
                      <TableCell>{getText(i18nKeys.STUDY_OVERVIEW__NAME)}</TableCell>
                      <TableCell>{getText(i18nKeys.STUDY_OVERVIEW__SCHEMA_NAME)}</TableCell>
                      <TableCell>{getText(i18nKeys.STUDY_OVERVIEW__CREATED_AT)}</TableCell>
                      <TableCell>{getText(i18nKeys.STUDY_OVERVIEW__UPDATED_AT)}</TableCell>
                      <TableCell>{getText(i18nKeys.STUDY_OVERVIEW__ACTIONS)}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {strategusAnalysisDatasets.map((dataset: Study) => (
                      <TableRow key={dataset.id}>
                        <TableCell className="icon-cell icon-cell--no-children"></TableCell>
                        <TableCell>
                          <Text textFormat="wrap" textStyle={{ paddingTop: "5px" }}>
                            {dataset.studyDetail?.name || getText(i18nKeys.STUDY_OVERVIEW__UNTITLED)}
                          </Text>
                        </TableCell>
                        <TableCell>
                          <Text textFormat="wrap" showCopy textStyle={{ paddingTop: "5px" }}>
                            {dataset.schemaName || "-"}
                          </Text>
                        </TableCell>
                        <TableCell>
                          {dataset.strategusAnalysis?.createdAt
                            ? new Date(dataset.strategusAnalysis.createdAt).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {dataset.strategusAnalysis?.updatedAt
                            ? new Date(dataset.strategusAnalysis.updatedAt).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell className="col-action">
                          {dataset.strategusAnalysis && (
                            <StudyActionSelector
                              study={dataset.strategusAnalysis}
                              handleRunStrategusStudy={handleRunStrategusStudy}
                              handleCleanupStrategusStudy={handleCleanupStrategusStudy}
                              handleManageStrategusResultViewer={handleManageStrategusResultViewer}
                              handleUploadStrategusResults={handleUploadStrategusResults}
                              handleDownloadStrategusResults={handleDownloadStrategusResults}
                              handleStudyPermissions={handleStrategusStudyPermissions}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : null}
          </>

          {/* No Data Message */}
          {(!datasets || datasets.length === 0) && (
            <TableContainer className="studyoverview__list">
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      {getText(i18nKeys.STUDY_OVERVIEW__NO_DATA)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {activeDataset && (
            <UpdateStudyDialog
              dataset={activeDataset}
              open={showUpdateStudyDialog}
              onClose={handleCloseUpdateStudyDialog}
            />
          )}
          {showResourcesDialog && (
            <DatasetResourcesDialog study={activeDataset} open={showResourcesDialog} onClose={closeResourcesDialog} />
          )}
          {showCopyStudyDialog && (
            <CopyStudyDialog
              study={activeDataset}
              open={showCopyStudyDialog}
              onClose={handleCloseCopyStudyDialog}
              loading={loading}
              setLoading={setLoading}
            />
          )}
          {showDeleteStudyDialog && (
            <DeleteStudyDialog
              study={activeDataset}
              open={showDeleteStudyDialog}
              onClose={handleCloseDeleteStudyDialog}
            />
          )}
          {showPermissionsDialog && (
            <PermissionsDialog study={activeDataset} open={showPermissionsDialog} onClose={closePermissionsDialog} />
          )}

          {showUpdateDialog && (
            <UpdateSchemaDialog study={activeDataset} open={showUpdateDialog} onClose={closeUpdateDialog} />
          )}

          {showReleaseDialog && (
            <CreateReleaseDialog
              study={activeDataset}
              open={showReleaseDialog}
              onClose={closeReleaseDialog}
              loading={loading}
              setLoading={setLoading}
            />
          )}

          {showDataQualityDialog && (
            <AnalysisDialog
              study={activeDataset}
              runType={JobRunTypes.DQD}
              open={showDataQualityDialog}
              onClose={closeDataQualityDialog}
            />
          )}

          {showDataCharacterizationDialog && (
            <AnalysisDialog
              study={activeDataset}
              runType={JobRunTypes.DataCharacterization}
              open={showDataCharacterizationDialog}
              onClose={closeDataCharacterizationDialog}
            />
          )}

          {showCreateCacheDialog && (
            <CreateCacheDialog dataset={activeDataset} open={showCreateCacheDialog} onClose={closeCreateCacheDialog} />
          )}

          {showSetupSemanticSearchDialog && (
            <SetupSemanticSearchDialog
              dataset={activeDataset}
              open={showSetupSemanticSearchDialog}
              onClose={closeSetupSemanticSearchDialog}
            />
          )}

          {showSourceInformationDialog && (
            <SourceInformationDialog
              dataset={activeDataset}
              open={showSourceInformationDialog}
              onClose={closeSourceInformationDialog}
            />
          )}

          {showManageViewerDialog && (
            <ManageViewerDialog
              config={{
                type: viewerDialogType,
                id: viewerDialogType === "dashboard" ? activeDataset?.id! : activeStrategusStudy?.studyId!,
                datasetId: viewerDialogType === "strategus" ? activeStrategusStudy?.datasetId : undefined,
              }}
              open={showManageViewerDialog}
              onClose={closeManageViewerDialog}
            />
          )}

          {showAddStrategusStudyDialog && (
            <AddStrategusStudyDialog open={showAddStrategusStudyDialog} onClose={handleCloseAddStrategusStudyDialog} />
          )}

          {showRunStrategusStudyDialog && (
            <RunStrategusStudyDialog
              study={activeStrategusStudy}
              open={showRunStrategusStudyDialog}
              onClose={closeRunStrategusStudyDialog}
            />
          )}

          {showCleanupStrategusStudyDialog && (
            <CleanupStrategusStudyDialog
              study={activeStrategusStudy}
              open={showCleanupStrategusStudyDialog}
              onClose={closeCleanupStrategusStudyDialog}
            />
          )}
          {showUploadStrategusResultsDialog && activeStrategusStudy && (
            <UploadStrategusResultsDialog
              study={activeStrategusStudy}
              open={showUploadStrategusResultsDialog}
              onClose={closeUploadStrategusResultsDialog}
            />
          )}

        </div>
      </div>
    </div>
  );
};

export default StudyOverview;
