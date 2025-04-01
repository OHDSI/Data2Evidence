import React, { FC, useCallback, useState } from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableHead from "@mui/material/TableHead";
import TableContainer from "@mui/material/TableContainer";
import {
  Loader,
  TableCell,
  TableRow,
  Text,
  VisibilityPublicIcon,
  VisibilityOnIcon,
  VisibilityOffIcon,
  Button,
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

  const [activeDataset, setActiveDataset] = useState<Study>();
  const [loading, setLoading] = useState(false);

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

  const fetchDatamodelUpdates = useCallback(async () => {
    setFetchUpdatesLoading(true);
    const datasetsByFlow: Record<string, Study[]> = {};
    const apiRequests = [];
    datasets.forEach((item: Study) => {
      const flowName = item.plugin;

      if (flowName === "custom-flow") return;
      if (!datasetsByFlow[flowName]) {
        datasetsByFlow[flowName] = [];
      }
      datasetsByFlow[flowName].push(item);
    });

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
    apiRequests.push(
      api.dataflow.createGetVersionInfoFlowRun({
        flowRunName: "datamart-get_version_info",
        options: {
          options: {
            flow_action_type: "get_version_info",
            token: "",
            database_code: "",
            data_model: "",
            plugin: "datamart_plugin",
            datasets: datasets.filter(
              (dataset) => dataset.attributes?.some((attribute) => attribute.attributeId === "source_dataset_id") // Filter out the datamart dataset
            ),
          },
        },
      })
    );

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
                  <TableCell>{getText(i18nKeys.STUDY_OVERVIEW__ACTIONS)}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(!datasets || datasets.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      {getText(i18nKeys.STUDY_OVERVIEW__NO_DATA)}
                    </TableCell>
                  </TableRow>
                )}
                {datasets?.map((dataset: Study) => (
                  <TableRow key={dataset.id}>
                    <TableCell style={{ paddingLeft: "2.75em" }}>{visibilityIcon(dataset.visibilityStatus)}</TableCell>
                    <TableCell style={{ maxWidth: "120px" }}>
                      <Text textFormat="wrap" showCopy textStyle={{ paddingTop: "5px" }}>
                        {dataset.id}
                      </Text>
                    </TableCell>
                    <TableCell>
                      {dataset.studyDetail?.name
                        ? dataset.studyDetail.name
                        : getText(i18nKeys.STUDY_OVERVIEW__UNTITLED)}
                    </TableCell>
                    <TableCell style={{ maxWidth: "120px" }}>
                      <Text
                        textFormat="wrap"
                        {...(dataset.schemaName && { showCopy: true })}
                        textStyle={{ paddingTop: "5px" }}
                      >
                        {dataset.schemaName ? dataset.schemaName.toUpperCase() : "-"}
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
                    <TableCell>
                      {getAttributeValue(dataset.attributes, StudyAttributeConfigIds.LATEST_SCHEMA_VERSION)}
                    </TableCell>
                    <TableCell>{`${dataset.dataModel} [${dataset.plugin}]`}</TableCell>

                    <TableCell className="col-action">
                      <ActionSelector
                        dataset={dataset}
                        isSchemaUpdatable={checkIfStudyIsUpdatable(dataset)}
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
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

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
        </div>
      </div>
    </div>
  );
};

export default StudyOverview;
