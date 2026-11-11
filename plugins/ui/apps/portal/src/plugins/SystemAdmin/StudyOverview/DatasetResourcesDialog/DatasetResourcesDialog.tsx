import Divider from "@mui/material/Divider";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableHead from "@mui/material/TableHead";
import {
  Button,
  Dialog,
  DownloadIcon,
  IconButton,
  Loader,
  TableCell,
  TableRow,
  Tooltip,
  TrashIcon,
} from "@portal/components";
import React, { ChangeEvent, FC, useCallback, useState } from "react";
import { api } from "../../../../axios/api";
import { useTranslation } from "../../../../contexts";
import { useDatasetResources, useDialogHelper, useResourceUploadConfig } from "../../../../hooks";
import { CloseDialogType, DatasetResource, Feedback, Study } from "../../../../types";
import { downloadFromJsonResponse } from "../../../../utils/downloadResource";
import { formatFileTypeList, formatMaxFileSize, toAcceptAttribute } from "../../../../utils/resourceUpload";
import DatasetDeleteResourceDialog from "./DatasetDeleteResourceDialog/DatasetDeleteResourceDialog";
import "./DatasetResourcesDialog.scss";
import DatasetResourceUploadConfirmDialog from "./DatasetResourceUploadConfirmDialog/DatasetResourceUploadConfirmDialog";

// Light tooltip from the design. pre-line keeps the line break from the
// translation text.
const addFileTooltipSx = {
  backgroundColor: "#fff",
  color: "#5f6368",
  fontSize: 12,
  lineHeight: 1.5,
  maxWidth: 240,
  padding: "8px 12px",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
  whiteSpace: "pre-line",
} as const;

interface DatasetResourcesDialogProps {
  study?: Study;
  open: boolean;
  onClose?: () => void;
}

const DatasetResourcesDialog: FC<DatasetResourcesDialogProps> = ({ study, open, onClose }) => {
  const { getText, i18nKeys } = useTranslation();
  const datasetId = study?.id || "";
  const [hasChanges, setHasChanges] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>({});
  const hiddenFileInput = React.useRef<HTMLInputElement>(null);
  const [refetch, setRefetch] = useState(0);
  const [resources, loading, error] = useDatasetResources(datasetId, refetch);
  const [showConfirmDialog, openConfirmDialog, closeConfirmDialog] = useDialogHelper(false);
  const [showDeleteDialog, openDeleteDialog, closeDeleteDialog] = useDialogHelper(false);
  const [selectedFile, setSelectedFile] = useState<File>();
  const [activeResource, setActiveResource] = useState<DatasetResource>();
  const [downloading, setDownloading] = useState<string>();
  const [uploadConfig] = useResourceUploadConfig();

  const handleClose = useCallback(() => {
    setFeedback({});
    typeof onClose === "function" && onClose();
  }, [onClose, setFeedback]);

  const handleAddFile = useCallback(() => {
    setFeedback({});

    if (hiddenFileInput.current !== null) {
      hiddenFileInput.current.click();
    }
  }, [hiddenFileInput]);

  const handleConfirmUpload = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length == 0) return;

      setSelectedFile(e.target.files[0]);
      openConfirmDialog();
    },
    [openConfirmDialog]
  );

  const handleConfirmUploadClose = useCallback(
    async (type: CloseDialogType) => {
      if (!datasetId) return;

      if (type === "success") {
        setHasChanges(true);
        setRefetch((refetch) => refetch + 1);
      }

      closeConfirmDialog();
    },
    [closeConfirmDialog, datasetId]
  );

  const handleDownloadResource = useCallback(
    async (resource: DatasetResource) => {
      try {
        setDownloading(resource.name);
        const response = await api.systemPortal.downloadResource(datasetId, resource.name);
        await downloadFromJsonResponse(response, resource.name);
      } catch (error) {
        console.error("File Download error:", error);
        setFeedback({
          type: "error",
          message: getText(i18nKeys.DATASET_RESOURCES_DIALOG__ERROR),
        });
      } finally {
        setDownloading(undefined);
      }
    },
    [datasetId, getText, i18nKeys]
  );

  const handleDeleteResource = useCallback(
    (resource: DatasetResource) => {
      setActiveResource(resource);
      openDeleteDialog();
    },
    [openDeleteDialog]
  );

  const handleDeleteResourceClose = useCallback(
    async (type: CloseDialogType) => {
      if (!datasetId) return;

      if (type === "success") {
        setHasChanges(true);

        setFeedback({
          type: "success",
          message: getText(i18nKeys.DATASET_RESOURCES_DIALOG__SUCCESS),
        });

        setRefetch((refetch) => refetch + 1);
      }

      closeDeleteDialog();
    },
    [closeDeleteDialog, datasetId]
  );

  if (error) console.error(error.message);
  if (loading) return <Loader />;

  return (
    <>
      <Dialog
        className="dataset-resources-dialog"
        title={`${getText(i18nKeys.DATASET_RESOURCES_DIALOG__TITLE_1)} - ${
          study?.studyDetail?.name || getText(i18nKeys.DATASET_RESOURCES_DIALOG__TITLE_2)
        }`}
        closable
        open={open}
        onClose={() => handleClose()}
        feedback={feedback}
        maxWidth="md"
      >
        <Divider />
        <div className="dataset-resources-dialog__content">
          <div className="dataset-resources-dialog__content-header">
            <Tooltip
              title={
                uploadConfig
                  ? getText(i18nKeys.DATASET_RESOURCES_DIALOG__ADD_FILE_TOOLTIP, [
                      formatFileTypeList(uploadConfig.allowedExtensions),
                      formatMaxFileSize(uploadConfig.maxFileSizeBytes),
                    ])
                  : ""
              }
              placement="bottom-end"
              arrow
              slotProps={{ tooltip: { sx: addFileTooltipSx }, arrow: { sx: { color: "#fff" } } }}
            >
              <span>
                <Button text={getText(i18nKeys.DATASET_RESOURCES_DIALOG__ADD_FILE)} onClick={handleAddFile} />
              </span>
            </Tooltip>
            <input
              type="file"
              name="resourceFile"
              accept={uploadConfig ? toAcceptAttribute(uploadConfig.allowedExtensions) : undefined}
              ref={hiddenFileInput}
              onChange={handleConfirmUpload}
              onClick={() => {
                if (hiddenFileInput.current) {
                  hiddenFileInput.current.value = "";
                }
              }}
              style={{ display: "none" }}
            />
          </div>
          <Table className="dataset-resources-dialog__content-table">
            <colgroup>
              <col />
              <col style={{ width: 140 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 240 }} />
            </colgroup>
            <TableHead>
              <TableRow>
                <TableCell>{getText(i18nKeys.DATASET_RESOURCES_DIALOG__FILENAME)}</TableCell>
                <TableCell>{getText(i18nKeys.DATASET_RESOURCES_DIALOG__SIZE)}</TableCell>
                <TableCell>{getText(i18nKeys.DATASET_RESOURCES_DIALOG__FILE)}</TableCell>
                <TableCell>{getText(i18nKeys.DATASET_RESOURCES_DIALOG__ACTION)}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(!resources || resources.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    {getText(i18nKeys.DATASET_RESOURCES_DIALOG__NO_FILE_AVAILABLE)}
                  </TableCell>
                </TableRow>
              )}
              {resources.map((res) => (
                <TableRow key={res.name}>
                  <TableCell style={{ color: "#000e7e" }}>{res.name}</TableCell>
                  <TableCell style={{ color: "#000e7e" }}>{res.size}</TableCell>
                  <TableCell style={{ color: "#000e7e" }}>{res.type}</TableCell>
                  <TableCell>
                    <IconButton
                      startIcon={<DownloadIcon />}
                      title={getText(i18nKeys.DATASET_RESOURCES_DIALOG__DOWNLOAD)}
                      onClick={() => handleDownloadResource(res)}
                      loading={downloading === res.name}
                    />
                    <IconButton
                      startIcon={<TrashIcon />}
                      title={getText(i18nKeys.DATASET_RESOURCES_DIALOG__DELETE)}
                      onClick={() => handleDeleteResource(res)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <Divider />
        <div className="button-group-actions">
          <Button
            text={getText(i18nKeys.DATASET_RESOURCES_DIALOG__CANCEL)}
            onClick={handleClose}
            variant="outlined"
            block
            disabled={hasChanges}
          />
          <Button
            text={getText(i18nKeys.DATASET_RESOURCES_DIALOG__DONE)}
            onClick={handleClose}
            block
            disabled={!hasChanges}
          />
        </div>
      </Dialog>
      {study?.id && (
        <DatasetResourceUploadConfirmDialog
          datasetId={study.id}
          file={selectedFile}
          open={showConfirmDialog}
          onClose={handleConfirmUploadClose}
        />
      )}
      {study?.id && activeResource && (
        <DatasetDeleteResourceDialog
          datasetId={study.id}
          resource={activeResource}
          open={showDeleteDialog}
          onClose={handleDeleteResourceClose}
        />
      )}
    </>
  );
};

export default DatasetResourcesDialog;
