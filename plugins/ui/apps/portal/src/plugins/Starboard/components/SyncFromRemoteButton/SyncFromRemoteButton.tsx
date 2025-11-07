import { Button } from "@portal/components";
import React, { FC, useCallback, useEffect, useState } from "react";
import { api } from "../../../../axios/api";
import { RemoteDiffCheckResponse } from "../../../../axios/study-notebook";
import { useFeedback, useTranslation } from "../../../../contexts";
import { StarboardNotebook } from "../../utils/notebook";

interface SyncFromRemoteButtonProps {
  activeNotebook?: StarboardNotebook;
  fetchNotebooks: () => Promise<void>;
  activeDatasetId?: string;
}

export const SyncFromRemoteButton: FC<SyncFromRemoteButtonProps> = ({
  activeNotebook,
  fetchNotebooks,
  activeDatasetId,
}) => {
  const { setFeedback } = useFeedback();
  const { getText, i18nKeys } = useTranslation();
  const [diffCheck, setDiffCheck] = useState<RemoteDiffCheckResponse | null>(null);
  const [isCheckingDiff, setIsCheckingDiff] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const checkDiff = useCallback(async () => {
    if (!activeNotebook?.id || !activeDatasetId) {
      return;
    }

    try {
      setIsCheckingDiff(true);
      const result = await api.studyNotebook.checkRemoteDiff(activeNotebook.id, activeDatasetId);
      setDiffCheck(result);
    } catch (error: any) {
      console.error("Failed to check remote diff:", error);
      setDiffCheck({ hasDifferences: false, reason: "Error checking differences" });
    } finally {
      setIsCheckingDiff(false);
    }
  }, [activeNotebook?.id, activeDatasetId]);

  // Check for differences when notebook changes and then every 30 seconds
  useEffect(() => {
    if (activeNotebook?.id && activeDatasetId) {
      checkDiff();
      const interval = setInterval(checkDiff, 30000);
      return () => clearInterval(interval);
    }
  }, [activeNotebook?.id, activeDatasetId, checkDiff]);

  const handleSyncClick = useCallback(async () => {
    if (!activeNotebook?.id || !activeDatasetId) {
      return;
    }

    try {
      setIsSyncing(true);
      await api.studyNotebook.overwriteFromRemote(activeNotebook.id, activeDatasetId);
      await fetchNotebooks();
      setFeedback({
        type: "success",
        message: getText(i18nKeys.STARBOARD__SUCCESS_SYNC_FROM_REMOTE),
      });
      // Refresh diff check after sync
      checkDiff();
    } catch (error: any) {
      console.error("Failed to sync from remote:", error);
      setFeedback({
        type: "error",
        message: error?.response?.data?.message || error.message || getText(i18nKeys.STARBOARD__ERROR_SYNC_FROM_REMOTE),
      });
    } finally {
      setIsSyncing(false);
    }
  }, [activeNotebook?.id, activeDatasetId, fetchNotebooks, setFeedback, checkDiff]);

  if (!activeNotebook?.id || !activeDatasetId) {
    return null;
  }

  const hasNoDifferences = diffCheck ? !diffCheck.hasDifferences : false;
  const isDisabled = isSyncing || isCheckingDiff || hasNoDifferences;

  return (
    <Button
      text={
        isSyncing ? getText(i18nKeys.STARBOARD__SYNCING_BUTTON) : getText(i18nKeys.STARBOARD__SYNC_FROM_REMOTE_BUTTON)
      }
      onClick={handleSyncClick}
      disabled={isDisabled}
      loading={isSyncing}
      variant="outlined"
      color="primary"
      size="small"
    />
  );
};
