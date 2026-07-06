import React, { FC, useCallback, useEffect, useState } from "react";
import { CloseDialogType, Study } from "../../../../types";
import { Dialog, Button } from "@portal/components";
import Divider from "@mui/material/Divider";
import TextField from "@mui/material/TextField";
import "./SourceInformationDialog.scss";
import { useTranslation } from "../../../../contexts";
import { i18nKeys } from "../../../../contexts/app-context/states";
import { api } from "../../../../axios/api";

interface SourceInformationDialogProps {
  dataset?: Study;
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
}

const SourceInformationDialog: FC<SourceInformationDialogProps> = ({ dataset, open, onClose }) => {
  const { getText } = useTranslation();

  const [cacheInfo, setCacheInfo] = useState<{
    cacheExists: boolean;
    lastModified: number | null;
    activeJobStatus?: string | null;
  } | null>(null);
  const [cacheLoading, setCacheLoading] = useState(false);

  useEffect(() => {
    if (!open || dataset?.type !== "webapi" || !dataset?.id) {
      setCacheInfo(null);
      return;
    }
    let active = true;
    setCacheLoading(true);
    api.systemPortal
      .getCacheStatus(dataset.id)
      .then((status) => {
        if (active)
          setCacheInfo({
            cacheExists: status.cacheExists,
            lastModified: status.lastModified,
            activeJobStatus: status.activeJobStatus,
          });
      })
      .catch(() => {
        if (active) setCacheInfo(null);
      })
      .finally(() => {
        if (active) setCacheLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, dataset?.id, dataset?.type]);

  const handleClose = useCallback(
    (type: CloseDialogType) => {
      typeof onClose === "function" && onClose(type);
    },
    [onClose]
  );

  // A cache build (kicked off on dataset creation or via "Refresh cache") is in
  // progress when there is an active job that has not reached a terminal state.
  const TERMINAL_JOB_STATUSES = ["COMPLETED", "FAILED", "STOPPED", "ABANDONED"];
  const isCacheBuilding =
    !!cacheInfo?.activeJobStatus && !TERMINAL_JOB_STATUSES.includes(cacheInfo.activeJobStatus);

  const cacheStatusText = cacheLoading
    ? "…"
    : cacheInfo?.cacheExists && cacheInfo?.lastModified
    ? getText(i18nKeys.SOURCE_INFORMATION_DIALOG__CACHE_LAST_REFRESHED, [
        new Date(cacheInfo.lastModified).toLocaleString(),
      ])
    : isCacheBuilding
    ? getText(i18nKeys.SOURCE_INFORMATION_DIALOG__CACHE_BUILDING)
    : getText(i18nKeys.SOURCE_INFORMATION_DIALOG__NO_CACHE);

  return (
    <Dialog
      className="source-information-dialog"
      title={getText(i18nKeys.SOURCE_INFORMATION_DIALOG__TITLE)}
      closable
      open={open}
      onClose={() => handleClose("cancelled")}
      maxWidth="md"
    >
      <Divider />
      <div className="source-information-dialog__content">
        <div style={{ marginTop: "32px", fontWeight: "bold" }}>{getText(i18nKeys.SOURCE_INFORMATION_DIALOG__DATASET_NAME)}</div>
        <div style={{ marginBottom: "32px" }}>
          <TextField disabled fullWidth variant="standard" value={dataset?.studyDetail?.name} />
        </div>

        <div style={{ marginTop: "32px", fontWeight: "bold" }}>{getText(i18nKeys.SOURCE_INFORMATION_DIALOG__DATABASE_CODE)}</div>
        <div style={{ marginBottom: "32px" }}>
          <TextField disabled fullWidth variant="standard" value={dataset?.databaseCode} />
        </div>

        <div style={{ marginTop: "32px", fontWeight: "bold" }}>{getText(i18nKeys.SOURCE_INFORMATION_DIALOG__TOKEN_CODE)}</div>
        <div style={{ marginBottom: "32px" }}>
          <TextField disabled fullWidth variant="standard" value={dataset?.tokenStudyCode} />
        </div>

        {dataset?.type === "webapi" && (
          <>
            <div style={{ marginTop: "32px", fontWeight: "bold" }}>
              {getText(i18nKeys.SOURCE_INFORMATION_DIALOG__CACHE_SECTION)}
            </div>
            <div style={{ marginBottom: "32px" }}>
              <TextField disabled fullWidth variant="standard" value={cacheStatusText} />
            </div>
          </>
        )}
      </div>

      <Divider />
      <div className="button-group-actions">
        <Button
          text={getText(i18nKeys.UPDATE_STUDY_DIALOG__CANCEL)}
          onClick={() => handleClose("cancelled")}
          variant="outlined"
          block
        />
      </div>
    </Dialog>
  );
};

export default SourceInformationDialog;
