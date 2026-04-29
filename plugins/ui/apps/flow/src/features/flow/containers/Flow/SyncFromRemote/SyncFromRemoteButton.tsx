import React, { FC, useCallback } from "react";
import { useSelector } from "react-redux";
import { Button } from "@portal/components";
import SyncIcon from "@mui/icons-material/Sync";
import { RootState } from "../../../../../store";
import {
  useCheckRemoteDiffQuery,
  useOverwriteCanvasFromRemoteMutation,
} from "../../../slices";

interface SyncFromRemoteButtonProps {}

export const SyncFromRemoteButton: FC<SyncFromRemoteButtonProps> = () => {
  const dataflowId = useSelector((state: RootState) => state.flow.dataflowId);
  const [overwriteFromRemote, { isLoading: isSyncing }] =
    useOverwriteCanvasFromRemoteMutation();

  // Check for differences every 30 seconds, or when dataflowId changes
  const {
    data: diffCheck,
    isLoading: isCheckingDiff,
    refetch,
  } = useCheckRemoteDiffQuery(dataflowId!, {
    skip: !dataflowId,
    pollingInterval: 30000, // Check every 30 seconds
  });

  const handleSyncClick = useCallback(async () => {
    if (!dataflowId) {
      return;
    }

    try {
      const result = await overwriteFromRemote({ id: dataflowId }).unwrap();

      if (result.overwritten) {
        console.log(
          `Successfully synced from remote. Updated to version ${result.newVersion}`
        );
        // Refetch diff check after successful sync
        refetch();
      } else {
        console.log(result.message);
      }
    } catch (error: any) {
      console.error("Failed to sync from remote:", error);
    }
  }, [dataflowId, overwriteFromRemote, refetch]);

  if (!dataflowId) {
    return null;
  }

  const isDisabled = isSyncing || isCheckingDiff || !diffCheck?.hasDifferences;
  const buttonText = isSyncing
    ? "Syncing..."
    : isCheckingDiff
    ? "Checking..."
    : diffCheck?.hasDifferences
    ? "Sync from remote"
    : "Up to date";

  return (
    <Button
      variant="outlined"
      startIcon={<SyncIcon />}
      onClick={handleSyncClick}
      disabled={isDisabled}
      text={buttonText}
      size="small"
      title={diffCheck?.reason || "Checking for differences..."}
    />
  );
};
