import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../../axios/api";
import { useTranslation, useFeedback } from "../../../contexts";
import { useDatabases, useDatasets, useDialogHelper } from "../../../hooks";
import { CloseDialogType, NetworkStrategusStudy, Study, StudyAttribute } from "../../../types";

export enum StudyAttributeConfigIds {
  LATEST_SCHEMA_VERSION = "latest_schema_version",
  SCHEMA_VERSION = "schema_version",
}

export function useDataSourceController() {
  const { getText, i18nKeys } = useTranslation();
  const { setSuccessFeedback } = useFeedback();
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
  const [showManageMetadataDialog, openManageMetadataDialog, closeManageMetadataDialog] =
    useDialogHelper(false);
  const [showManageViewerDialog, openManageViewerDialog, closeManageViewerDialog] = useDialogHelper(false);
  const [showTransformDialog, openTransformDialog, closeTransformDialog] = useDialogHelper(false);
  const [showRefreshCacheDialog, openRefreshCacheDialog, closeRefreshCacheDialog] = useDialogHelper(false);
  const [viewerDialogType, setViewerDialogType] = useState<"dashboard" | "strategus">("dashboard");
  const [showAddStrategusStudyDialog, openAddStrategusStudyDialog, closeAddStrategusStudyDialog] =
    useDialogHelper(false);
  const [showRunStrategusStudyDialog, openRunStrategusStudyDialog, closeRunStrategusStudyDialog] =
    useDialogHelper(false);
  const [showCleanupStrategusStudyDialog, openCleanupStrategusStudyDialog, closeCleanupStrategusStudyDialog] =
    useDialogHelper(false);
  const [showDeleteStrategusStudyDialog, openDeleteStrategusStudyDialog, closeDeleteStrategusStudyDialog] =
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

  const handleManageMetadata = useCallback(
    (dataset: Study) => {
      setActiveDataset(dataset);
      openManageMetadataDialog();
    },
    [openManageMetadataDialog]
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

  const handleTransformToWebApi = useCallback(
    (dataset: Study) => {
      setActiveDataset(dataset);
      openTransformDialog();
    },
    [openTransformDialog]
  );

  const handleRefreshCache = useCallback(
    (dataset: Study) => {
      setActiveDataset(dataset);
      openRefreshCacheDialog();
    },
    [openRefreshCacheDialog]
  );

  const handleCloseTransformDialog = useCallback(
    (type: CloseDialogType) => {
      closeTransformDialog();
      if (type === "success") {
        setRefetch((refetch) => refetch + 1);
      }
    },
    [closeTransformDialog]
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

  const handleDeleteStrategusStudy = useCallback(
    (study: NetworkStrategusStudy) => {
      setActiveStrategusStudy(study);
      openDeleteStrategusStudyDialog();
    },
    [openDeleteStrategusStudyDialog]
  );

  const handleCloseDeleteStrategusStudyDialog = useCallback(
    (type: CloseDialogType) => {
      closeDeleteStrategusStudyDialog();
      if (type === "success") {
        setRefetch((refetch) => refetch + 1);
      }
    },
    [closeDeleteStrategusStudyDialog]
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
      } else if (type === "hana__omop" || type === "hana__non_omop" || type === "webapi") {
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
        setSuccessFeedback(getText(i18nKeys.UPDATE_DATA_SOURCE_DIALOG__SUCCESS));
        setRefetch((refetch) => refetch + 1);
      }
    },
    [closeUpdateStudyDialog, setSuccessFeedback, getText, i18nKeys]
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

  const handleCloseManageMetadataDialog = useCallback(
    (type: CloseDialogType) => {
      closeManageMetadataDialog();
      if (type === "success") {
        setRefetch((refetch) => refetch + 1);
      }
    },
    [closeManageMetadataDialog]
  );

  const handleCloseDeleteStudyDialog = useCallback(
    (type: CloseDialogType) => {
      closeDeleteStudyDialog();
      if (type === "success") {
        setSuccessFeedback(getText(i18nKeys.DELETE_STUDY_DIALOG__SUCCESS));
        setRefetch((refetch) => refetch + 1);
      }
    },
    [closeDeleteStudyDialog, setSuccessFeedback, getText, i18nKeys]
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
      } else if (
        item.type === "source" ||
        item.type === "hana__omop" ||
        item.type === "hana__non_omop" ||
        item.type === "webapi" ||
        item.type === "i2b2"
      ) {
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

  const findAttributeValue = (
    attributes: StudyAttribute[] | undefined,
    attributeConfigId: StudyAttributeConfigIds
  ): string | null => {
    if (!attributes) return null;
    const attr = attributes.find((attribute: StudyAttribute) => attribute.attributeId === attributeConfigId);
    return attr ? attr.value : null;
  };

  const getAttributeDisplay = (
    attributes: StudyAttribute[] | undefined,
    attributeConfigId: StudyAttributeConfigIds
  ): string => {
    return findAttributeValue(attributes, attributeConfigId) ?? getText(i18nKeys.STUDY_OVERVIEW__NOT_AVAILABLE);
  };

  const checkIfStudyIsUpdatable = (dataset: Study): boolean => {
    const currentSchemaVersion = findAttributeValue(dataset.attributes, StudyAttributeConfigIds.SCHEMA_VERSION);
    const latestSchemaVersion = findAttributeValue(dataset.attributes, StudyAttributeConfigIds.LATEST_SCHEMA_VERSION);

    if (!currentSchemaVersion || !latestSchemaVersion) {
      return false;
    }

    return currentSchemaVersion !== latestSchemaVersion;
  };

  return {
    getText,
    i18nKeys,
    datasets,
    databases,
    loadingDatasets,
    error,
    sourceOmopHanaDatasets,
    fhirDatasets,
    studyDatasets,
    strategusAnalysisDatasets,
    loadingStrategusStudies,
    expandedRows,
    toggleRow,
    activeDataset,
    activeStrategusStudy,
    viewerDialogType,
    loading,
    setLoading,
    fetchUpdatesLoading,
    fetchDatamodelUpdates,
    getDbDialect,
    checkIfStudyIsUpdatable,
    getAttributeDisplay,
    handleSourceInformation,
    handleUpdateStudy,
    handleManageMetadata,
    handleCloseManageMetadataDialog,
    showManageMetadataDialog,
    handleResources,
    handleCopyStudy,
    handleDeleteStudy,
    handlePermissions,
    handleRelease,
    handleUpdate,
    handleDataQuality,
    handleDataCharacterization,
    handleCreateCache,
    handleSetupSemanticSearch,
    handleManageDashboard,
    handleTransformToWebApi,
    handleRefreshCache,
    handleRunStrategusStudy,
    handleCleanupStrategusStudy,
    handleDeleteStrategusStudy,
    handleManageStrategusResultViewer,
    handleStrategusStudyPermissions,
    handleUploadStrategusResults,
    handleDownloadStrategusResults,
    openAddStudyDialog,
    openAddStrategusStudyDialog,
    showAddStudyDialog,
    showUpdateStudyDialog,
    showResourcesDialog,
    showCopyStudyDialog,
    showDeleteStudyDialog,
    showPermissionsDialog,
    showUpdateDialog,
    showReleaseDialog,
    showDataQualityDialog,
    showDataCharacterizationDialog,
    showCreateCacheDialog,
    showSetupSemanticSearchDialog,
    showSourceInformationDialog,
    showManageViewerDialog,
    showTransformDialog,
    showRefreshCacheDialog,
    showAddStrategusStudyDialog,
    showRunStrategusStudyDialog,
    showCleanupStrategusStudyDialog,
    showDeleteStrategusStudyDialog,
    showUploadStrategusResultsDialog,
    handleCloseAddStudyDialog,
    handleCloseUpdateStudyDialog,
    closeResourcesDialog,
    handleCloseCopyStudyDialog,
    handleCloseDeleteStudyDialog,
    closePermissionsDialog,
    closeUpdateDialog,
    closeReleaseDialog,
    closeDataQualityDialog,
    closeDataCharacterizationDialog,
    closeCreateCacheDialog,
    closeSetupSemanticSearchDialog,
    closeSourceInformationDialog,
    closeManageViewerDialog,
    handleCloseTransformDialog,
    closeRefreshCacheDialog,
    handleCloseAddStrategusStudyDialog,
    closeRunStrategusStudyDialog,
    closeCleanupStrategusStudyDialog,
    handleCloseDeleteStrategusStudyDialog,
    closeUploadStrategusResultsDialog,
  };
}
