import { FC, useCallback, useEffect, useState } from "react";
import { Button, Dialog, TextField } from "ui-react";
import { CloseDialogType, Study } from "../../../../types";
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
    : isCacheBuilding
    ? getText(i18nKeys.SOURCE_INFORMATION_DIALOG__CACHE_BUILDING)
    : cacheInfo?.cacheExists && cacheInfo?.lastModified
    ? getText(i18nKeys.SOURCE_INFORMATION_DIALOG__CACHE_LAST_REFRESHED, [
        new Date(cacheInfo.lastModified).toLocaleString(),
      ])
    : getText(i18nKeys.SOURCE_INFORMATION_DIALOG__NO_CACHE);

  return (
    <Dialog
      title={getText(i18nKeys.SOURCE_INFORMATION_DIALOG__TITLE)}
      size="l"
      open={open}
      onClose={() => handleClose("cancelled")}
      actions={
        <Button variant="secondary" onClick={() => handleClose("cancelled")}>
          {getText(i18nKeys.UPDATE_DATA_SOURCE_DIALOG__CANCEL)}
        </Button>
      }
    >
      <div className="source-information-dialog__content">
        <div>
          <TextField
            disabled
            label={getText(i18nKeys.SOURCE_INFORMATION_DIALOG__DATA_SOURCE_NAME)}
            value={dataset?.studyDetail?.name ?? ""}
          />
        </div>
        <div>
          <TextField
            disabled
            label={getText(i18nKeys.SOURCE_INFORMATION_DIALOG__DATABASE_CODE)}
            value={dataset?.databaseCode ?? ""}
          />
        </div>
        <div>
          <TextField
            disabled
            label={getText(i18nKeys.SOURCE_INFORMATION_DIALOG__TOKEN_CODE)}
            value={dataset?.tokenStudyCode ?? ""}
          />
        </div>
        {dataset?.type === "webapi" && (
          <div>
            <TextField
              disabled
              label={getText(i18nKeys.SOURCE_INFORMATION_DIALOG__CACHE_SECTION)}
              value={cacheStatusText}
            />
          </div>
        )}
      </div>
    </Dialog>
  );
};

export default SourceInformationDialog;
