import React, { FC, useCallback, useEffect, useMemo, useState } from "react";
import { SxProps } from "@mui/system";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import Grid from "@mui/material/Grid";
import { Button, Dialog, TermsOfUseIcon } from "@portal/components";
import { api } from "../../../../../axios/api";
import { getFileSizeDisplay, getFileExtension } from "../../../../../utils";
import {
  checkResourceFile,
  formatFileTypeList,
  formatMaxFileSize,
  ResourceFileError,
} from "../../../../../utils/resourceUpload";
import { CloseDialogType, DatasetResource, Feedback, ResourceUploadConfig } from "../../../../../types";
import "./DatasetResourceUploadConfirmDialog.scss";
import { useTranslation } from "../../../../../contexts";

interface DatasetResourceUploadConfirmDialogProps {
  datasetId: string;
  file?: File;
  // Upload rules from the backend. When missing, the dialog skips its own
  // check and relies on the backend's.
  uploadConfig?: ResourceUploadConfig;
  open: boolean;
  onClose?: (type: CloseDialogType, resource?: DatasetResource) => void;
}

const styles: SxProps = {
  color: "#000080",
  "&::after, &:hover:not(.Mui-disabled)::before": {
    borderBottom: "2px solid #000080",
  },
  ".MuiInputLabel-root": {
    color: "#000080",
    "&.MuiInputLabel-shrink, &.Mui-focused": {
      color: "var(--color-neutral)",
    },
  },
  ".MuiInput-input:focus": {
    backgroundColor: "transparent",
  },
  "&.MuiMenuItem-root:hover": {
    backgroundColor: "#ebf2fa",
  },
};

// Rule failures from the browser, plus the backend's malware scan results.
type FileError = ResourceFileError | "blocked" | "scan-unavailable";

// The API prefixes messages with the status code ("400 - ...").
const stripStatusPrefix = (message: unknown) => String(message).replace(/^\d{3} - /, "");

const DatasetResourceUploadConfirmDialog: FC<DatasetResourceUploadConfirmDialogProps> = ({
  datasetId,
  file,
  uploadConfig,
  open,
  onClose,
}) => {
  const { getText, i18nKeys } = useTranslation();
  const [feedback, setFeedback] = useState<Feedback>({});
  const extension = getFileExtension(file?.name).toUpperCase();
  const [loading, setLoading] = useState(false);

  // Checked as soon as the file is picked, before Add: first the rules in the
  // browser, then (if they pass) the backend runs them again and scans the
  // file for malware without storing it.
  const [fileError, setFileError] = useState<FileError>();
  const [checkMessage, setCheckMessage] = useState<string>();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    setFileError(undefined);
    setCheckMessage(undefined);
    setChecking(false);
    if (!file) return undefined;
    let cancelled = false;
    setChecking(true);

    const check = async () => {
      if (uploadConfig) {
        const ruleError = await checkResourceFile(file, uploadConfig);
        if (cancelled || ruleError) {
          if (!cancelled) setFileError(ruleError);
          return;
        }
      }
      try {
        const { result } = await api.systemPortal.checkResource(datasetId, file);
        if (cancelled) return;
        if (result === "infected") setFileError("blocked");
        else if (result === "unavailable") setFileError("scan-unavailable");
      } catch (error: any) {
        if (cancelled) return;
        console.error("Failed to check file", error);
        // A rule the browser couldn't check (e.g. no config) comes back as a
        // message; anything else means the file couldn't be checked: fail closed.
        if (error?.data?.message) setCheckMessage(stripStatusPrefix(error.data.message));
        else setFileError("scan-unavailable");
      }
    };

    check().finally(() => {
      if (!cancelled) setChecking(false);
    });
    return () => {
      cancelled = true;
    };
  }, [datasetId, file, uploadConfig]);

  const validationError = useMemo(() => {
    if (checkMessage) return checkMessage;
    switch (fileError) {
      case "blocked":
        return getText(i18nKeys.DATASET_RESOURCE_UPLOAD_CONFIRM_DIALOG__ERROR_BLOCKED);
      case "scan-unavailable":
        return getText(i18nKeys.DATASET_RESOURCE_UPLOAD_CONFIRM_DIALOG__ERROR_SCAN_UNAVAILABLE);
    }
    if (!uploadConfig) return undefined;
    switch (fileError) {
      case "type":
        return getText(i18nKeys.DATASET_RESOURCE_UPLOAD_CONFIRM_DIALOG__ERROR_TYPE, [
          formatFileTypeList(
            uploadConfig.allowedExtensions,
            getText(i18nKeys.DATASET_RESOURCE_UPLOAD_CONFIRM_DIALOG__OR)
          ),
        ]);
      case "empty":
        return getText(i18nKeys.DATASET_RESOURCE_UPLOAD_CONFIRM_DIALOG__ERROR_EMPTY);
      case "corrupted":
        return getText(i18nKeys.DATASET_RESOURCE_UPLOAD_CONFIRM_DIALOG__ERROR_CORRUPTED);
      case "size":
        return getText(i18nKeys.DATASET_RESOURCE_UPLOAD_CONFIRM_DIALOG__ERROR_TOO_LARGE, [
          formatMaxFileSize(uploadConfig.maxFileSizeBytes),
        ]);
      default:
        return undefined;
    }
  }, [checkMessage, fileError, uploadConfig, getText, i18nKeys]);

  const mapFileToResource = useCallback(
    (file: File): DatasetResource => ({
      name: file.name,
      size: getFileSizeDisplay(file.size),
      type: getFileExtension(file.name).toUpperCase(),
    }),
    []
  );

  const handleClose = useCallback(
    async (type: CloseDialogType) => {
      setFeedback({});

      if (!file || type === "cancelled") {
        typeof onClose === "function" && onClose("cancelled");
        return;
      }

      if (type === "success") {
        try {
          setLoading(true);
          await api.systemPortal.addResource(datasetId, file);
          typeof onClose === "function" && onClose(type, mapFileToResource(file));
        } catch (error: any) {
          console.error(error);

          if (error.data?.message) {
            setFeedback({ type: "error", message: stripStatusPrefix(error.data.message) });
          } else {
            setFeedback({
              type: "error",
              message: getText(i18nKeys.DATASET_RESOURCE_UPLOAD_CONFIRM_DIALOG__ERROR),
              description: getText(i18nKeys.DATASET_RESOURCE_UPLOAD_CONFIRM_DIALOG__ERROR_DESCRIPTION),
            });
          }
        } finally {
          setLoading(false);
        }
      }
    },
    [datasetId, file, onClose, setFeedback, mapFileToResource, getText]
  );

  return (
    <Dialog
      className="dataset-resource-upload-confirm-dialog"
      title={getText(i18nKeys.DATASET_RESOURCE_UPLOAD_CONFIRM_DIALOG__ADD_FILE)}
      closable
      open={open}
      onClose={() => handleClose("cancelled")}
      feedback={validationError ? { type: "error", message: validationError } : feedback}
    >
      <Divider />
      <div className="dataset-resource-upload-confirm-dialog__content">
        <FormControl sx={styles} className="metadata-form" variant="standard" fullWidth>
          <FormLabel>{getText(i18nKeys.DATASET_RESOURCE_UPLOAD_CONFIRM_DIALOG__FILE)}</FormLabel>
          <Grid
            container
            className={`dataset-resource-upload-confirm-dialog__file${
              validationError ? " dataset-resource-upload-confirm-dialog__file--error" : ""
            }`}
          >
            <Grid item xs={7}>
              <TermsOfUseIcon style={{ marginRight: 10 }} />
              {file?.name || getText(i18nKeys.DATASET_RESOURCE_UPLOAD_CONFIRM_DIALOG__UNTITLED)}
            </Grid>
            <Grid item xs={2} justifyContent="flex-end">
              {getFileSizeDisplay(file?.size ?? 0)}
            </Grid>
            <Grid item xs={3} justifyContent="flex-end">
              {extension}
            </Grid>
          </Grid>
        </FormControl>
      </div>
      <Divider />
      <div className={`button-group-actions${validationError ? " button-group-actions--single" : ""}`}>
        <Button
          text={getText(i18nKeys.DATASET_RESOURCE_UPLOAD_CONFIRM_DIALOG__CANCEL)}
          onClick={() => handleClose("cancelled")}
          variant="outlined"
          block
          disabled={loading}
        />
        {/* A file that fails the check can only be cancelled. */}
        {!validationError && (
          <Button
            text={getText(i18nKeys.DATASET_RESOURCE_UPLOAD_CONFIRM_DIALOG__ADD)}
            onClick={() => handleClose("success")}
            block
            loading={loading || checking}
          />
        )}
      </div>
    </Dialog>
  );
};

export default DatasetResourceUploadConfirmDialog;
