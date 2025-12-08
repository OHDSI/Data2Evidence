import React, { FC, useCallback, useEffect, useMemo, useState } from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableHead from "@mui/material/TableHead";
import TableContainer from "@mui/material/TableContainer";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import {
  Loader,
  TableCell,
  TableRow,
  Text,
  VisibilityPublicIcon,
  VisibilityOnIcon,
  VisibilityOffIcon,
  Button,
  Tooltip,
} from "@portal/components";
import { CloseDialogType, Study, StudyAttribute } from "../../../types";
import { useDialogHelper, useDatasets, useDatabases } from "../../../hooks";
import { useTranslation } from "../../../contexts";
import AddStudyDialog from "./AddStudyDialog/AddStudyDialog";
import UpdateStudyDialog from "./UpdateStudyDialog/UpdateStudyDialog";
import DatasetResourcesDialog from "./DatasetResourcesDialog/DatasetResourcesDialog";
import CopyStudyDialog from "./CopyStudyDialog/CopyStudyDialog";
import DeleteStudyDialog from "./DeleteStudyDialog/DeleteStudyDialog";
import ActionSelector from "./ActionSelector/ActionSelector";
import PermissionsDialog from "./PermissionsDialog/PermissionsDialog";
import UpdateSchemaDialog from "./UpdateSchemaDialog/UpdateSchemaDialog";
import CreateReleaseDialog from "./CreateReleaseDialog/CreateReleaseDialog";
import AnalysisDialog from "./AnalysisDialog/AnalysisDialog";
import { api } from "../../../axios/api";
import { JobRunTypes } from "../DQD/types";
import CreateCacheDialog from "./CreateCacheDialog/CreateCacheDialog";
import SetupSemanticSearchDialog from "./SetupSemanticSearchDialog/SetupSemanticSearchDialog";
import SourceInformationDialog from "./SourceInformationDialog/SourceInformationDialog";
import "./StudyOverview.scss";
import ManageDashboardDialog from "./ManageDashboardDialog/ManageDashboardDialog";
import AddStrategusStudyDialog from "./AddStrategusStudyDialog/AddStrategusStudyDialog";

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
  const [showManageDashboardDialog, openManageDashboardDialog, closeManageDashboardDialog] = useDialogHelper(false);
  const [showAddStrategusStudyDialog, openAddStrategusStudyDialog, closeAddStrategusStudyDialog] =
    useDialogHelper(false);

  const [activeDataset, setActiveDataset] = useState<Study>();
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [strategusStudies, setStrategusStudies] = useState<any[]>([]);
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
      openManageDashboardDialog();
    },
    [openManageDashboardDialog]
  );

  const toggleRow = useCallback((datasetId: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [datasetId]: !prev[datasetId],
    }));
  }, []);

  useEffect(() => {
    const fetchStrategusStudies = async () => {
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
  }, [refetch]);

  // Organize datasets into parent-child structure for source/omop/hana and separate lists for studies and fhir
  const { sourceOmopHanaDatasets, studyDatasets, fhirDatasets } = useMemo(() => {
    if (!datasets) return { sourceOmopHanaDatasets: [], studyDatasets: [], fhirDatasets: [] };

    const sourceOmopHana: Study[] = [];
    const studies: Study[] = [];
    const fhir: Study[] = [];
    const childrenMap = new Map<string, Study[]>();

    // First pass: separate datasets by type and build children map
    datasets.forEach((dataset: Study) => {
      const type = dataset.type?.toLowerCase();
      
      if (type === "study") {
        // Only study type datasets go to studies table
        studies.push(dataset);
      } else if (type === "fhir" || type === "non_omop") {
        // FHIR and non_omop datasets go to FHIR table
        fhir.push(dataset);
      } else if (type === "source" || type === "omop" || type === "hana__omop" || type === "hana__non_omop") {
        // Source, OMOP, and all HANA datasets (hana__omop, hana__non_omop, etc.)
        // Check if this is a child dataset (has source_dataset_id attribute)
        const sourceIdAttribute = dataset.attributes?.find(
          (attr) => attr.attributeId === "source_dataset_id"
        );
        
        if (sourceIdAttribute && sourceIdAttribute.value) {
          // This is a child dataset
          const parentId = sourceIdAttribute.value;
          if (!childrenMap.has(parentId)) {
            childrenMap.set(parentId, []);
          }
          childrenMap.get(parentId)!.push(dataset);
        } else {
          // This is a parent or standalone dataset (hana datasets won't have children)
          sourceOmopHana.push(dataset);
        }
      }
    });

    const datasetsWithChildren = sourceOmopHana.map((dataset) => ({
      ...dataset,
      children: childrenMap.get(dataset.id) || [],
    }));

    return {
      sourceOmopHanaDatasets: datasetsWithChildren,
      studyDatasets: studies,
      fhirDatasets: fhir,
    };
  }, [datasets]);

  const visibilityImgAlt = useCallback((value?: string) => {
    if (!value) return;
    return value === "DEFAULT" ? "Normal" : value.charAt(0).toUpperCase() + value.substring(1).toLowerCase();
  }, []);

  const visibilityIcon = useCallback(
    (visibilityStatus: string) => {
      const alt = visibilityImgAlt(visibilityStatus);
      switch (visibilityStatus) {
        case "HIDDEN":
          return <VisibilityOffIcon title={alt} />;
        case "PUBLIC":
          return <VisibilityPublicIcon title={alt} />;
        default:
          return <VisibilityOnIcon title={alt} />;
      }
    },
    [visibilityImgAlt]
  );

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
      const hasSourceDatasetId = item.attributes?.some(
        (attribute) => attribute.attributeId === "source_dataset_id"
      );

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
          {visibilityIcon(dataset.visibilityStatus)}
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
                    {sourceOmopHanaDatasets.map((dataset: Study & { children?: Study[] }) => (
                      <React.Fragment key={dataset.id}>
                        {renderDatasetRow(dataset, false, (dataset.children?.length || 0) > 0)}
                        {dataset.children && dataset.children.length > 0 && (
                          <TableRow>
                            <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={9}>
                              <Collapse in={expandedRows[dataset.id]} timeout="auto" unmountOnExit>
                                <Table size="small">
                                  <TableBody>
                                    {dataset.children.map((child: Study) => renderDatasetRow(child, true, false))}
                                  </TableBody>
                                </Table>
                              </Collapse>
                            </TableCell>
                          </TableRow>
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
              <h4 className="dataset-section-title dataset-section-title--secondary">{getText(i18nKeys.STUDY_OVERVIEW__FHIR_DATASETS)}</h4>
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
                    {fhirDatasets.map((dataset: Study) => renderDatasetRow(dataset, false, false))}
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
                      <TableCell colSpan={9} align="center">
                        <Loader />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            ) : strategusStudies.length > 0 ? (
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
                      <TableCell>{getText(i18nKeys.STUDY_OVERVIEW__STUDY_ID)}</TableCell>
                      <TableCell>{getText(i18nKeys.STUDY_OVERVIEW__ANALYSIS_ID)}</TableCell>
                      <TableCell>{getText(i18nKeys.STUDY_OVERVIEW__MODE)}</TableCell>
                      <TableCell>{getText(i18nKeys.STUDY_OVERVIEW__NOTEBOOK_NAME)}</TableCell>
                      <TableCell>{getText(i18nKeys.STUDY_OVERVIEW__CREATED_AT)}</TableCell>
                      <TableCell>{getText(i18nKeys.STUDY_OVERVIEW__UPDATED_AT)}</TableCell>
                      <TableCell>{getText(i18nKeys.STUDY_OVERVIEW__TYPE)}</TableCell>
                      <TableCell>{getText(i18nKeys.STUDY_OVERVIEW__ACTIONS)}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {strategusStudies.map((study: any) => (
                      <TableRow key={study.analysisId || study.studyId}>
                        <TableCell className="icon-cell icon-cell--no-children"></TableCell>
                        <TableCell>
                          <Text textFormat="wrap" showCopy textStyle={{ paddingTop: "5px" }}>
                            {study.studyId}
                          </Text>
                        </TableCell>
                        <TableCell>
                          <Text textFormat="wrap" textStyle={{ paddingTop: "5px" }}>
                            {study.analysisId || "-"}
                          </Text>
                        </TableCell>
                        <TableCell>{study.mode || "-"}</TableCell>
                        <TableCell>{study.notebookName || "-"}</TableCell>
                        <TableCell>
                          {study.createdAt ? new Date(study.createdAt).toLocaleDateString() : "-"}
                        </TableCell>
                        <TableCell>
                          {study.updatedAt ? new Date(study.updatedAt).toLocaleDateString() : "-"}
                        </TableCell>
                        <TableCell>study</TableCell>
                        <TableCell className="col-action">
                          -
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

          {showManageDashboardDialog && (
            <ManageDashboardDialog
              study={activeDataset}
              open={showManageDashboardDialog}
              onClose={closeManageDashboardDialog}
            />
          )}

          {showAddStrategusStudyDialog && (
            <AddStrategusStudyDialog open={showAddStrategusStudyDialog} onClose={handleCloseAddStrategusStudyDialog} />
          )}
        </div>
      </div>
    </div>
  );
};

export default StudyOverview;
