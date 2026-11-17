import { ThemeProvider } from "@mui/material/styles";
import { theme as nativeTheme } from "../../../theme";
import { JobRunTypes } from "../DQD/types";
import AddStrategusStudyDialog from "./AddStrategusStudyDialog/AddStrategusStudyDialog";
import AddDataSourceDialog from "./AddDataSourceDialog/AddDataSourceDialog";
import AnalysisDialog from "./AnalysisDialog/AnalysisDialog";
import CleanupStrategusStudyDialog from "./CleanupStrategusStudyDialog/CleanupStrategusStudyDialog";
import DeleteStrategusStudyDialog from "./DeleteStrategusStudyDialog/DeleteStrategusStudyDialog";
import CopyStudyDialog from "./CopyStudyDialog/CopyStudyDialog";
import CreateCacheDialog from "./CreateCacheDialog/CreateCacheDialog";
import CreateReleaseDialog from "./CreateReleaseDialog/CreateReleaseDialog";
import DatasetResourcesDialog from "./DatasetResourcesDialog/DatasetResourcesDialog";
import DeleteStudyDialog from "./DeleteStudyDialog/DeleteStudyDialog";
import PermissionsDialog from "./PermissionsDialog/PermissionsDialog";
import RunStrategusStudyDialog from "./RunStrategusStudyDialog/RunStrategusStudyDialog";
import SetupSemanticSearchDialog from "./SetupSemanticSearchDialog/SetupSemanticSearchDialog";
import SourceInformationDialog from "./SourceInformationDialog/SourceInformationDialog";
import ManageMetadataDialog from "./ManageMetadataDialog/ManageMetadataDialog";
import UpdateSchemaDialog from "./UpdateSchemaDialog/UpdateSchemaDialog";
import UpdateDataSourceDialog from "./UpdateDataSourceDialog/UpdateDataSourceDialog";
import UploadStrategusResultsDialog from "./UploadStrategusResultsDialog/UploadStrategusResultsDialog";
import ManageViewerDialog from "./ManageViewerDialog/ManageViewerDialog";
import TransformToWebApiDialog from "./TransformToWebApiDialog/TransformToWebApiDialog";
import RefreshCacheDialog from "./RefreshCacheDialog/RefreshCacheDialog";
import { useDataSourceController } from "./useDataSourceController";

interface DataSourceDialogsProps {
  ctrl: ReturnType<typeof useDataSourceController>;
}

export function DataSourceDialogs({ ctrl }: DataSourceDialogsProps) {
  const {
    datasets,
    databases,
    loading,
    setLoading,
    activeDataset,
    activeStrategusStudy,
    viewerDialogType,
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
    showManageMetadataDialog,
    handleCloseManageMetadataDialog,
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
  } = ctrl;

  return (
    <>
      <AddDataSourceDialog
        open={showAddStudyDialog}
        onClose={handleCloseAddStudyDialog}
        loading={loading}
        setLoading={setLoading}
        studies={datasets}
        databases={databases}
      />
      {activeDataset && (
        <UpdateDataSourceDialog
          dataset={activeDataset}
          open={showUpdateStudyDialog}
          onClose={handleCloseUpdateStudyDialog}
        />
      )}
      {showSourceInformationDialog && (
        <SourceInformationDialog
          dataset={activeDataset}
          open={showSourceInformationDialog}
          onClose={closeSourceInformationDialog}
        />
      )}
      {showAddStrategusStudyDialog && (
        <AddStrategusStudyDialog open={showAddStrategusStudyDialog} onClose={handleCloseAddStrategusStudyDialog} />
      )}
      {showManageMetadataDialog && (
        <ManageMetadataDialog
          dataset={activeDataset}
          open={showManageMetadataDialog}
          onClose={handleCloseManageMetadataDialog}
        />
      )}

      <ThemeProvider theme={nativeTheme}>
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
          {showTransformDialog && (
            <TransformToWebApiDialog
              open={showTransformDialog}
              study={activeDataset}
              onClose={handleCloseTransformDialog}
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

          {showRefreshCacheDialog && (
            <RefreshCacheDialog
              dataset={activeDataset}
              open={showRefreshCacheDialog}
              onClose={closeRefreshCacheDialog}
            />
          )}

          {showSetupSemanticSearchDialog && (
            <SetupSemanticSearchDialog
              dataset={activeDataset}
              open={showSetupSemanticSearchDialog}
              onClose={closeSetupSemanticSearchDialog}
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
          {showDeleteStrategusStudyDialog && (
            <DeleteStrategusStudyDialog
              study={activeStrategusStudy}
              open={showDeleteStrategusStudyDialog}
              onClose={handleCloseDeleteStrategusStudyDialog}
            />
          )}
          {showUploadStrategusResultsDialog && activeStrategusStudy && (
            <UploadStrategusResultsDialog
              study={activeStrategusStudy}
              open={showUploadStrategusResultsDialog}
              onClose={closeUploadStrategusResultsDialog}
            />
          )}
      </ThemeProvider>
    </>
  );
}

export default DataSourceDialogs;
