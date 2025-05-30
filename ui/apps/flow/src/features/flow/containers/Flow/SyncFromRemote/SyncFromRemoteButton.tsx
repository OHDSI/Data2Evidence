import { Sync } from "@mui/icons-material";
import { Button } from "@portal/components";
import React, { FC, useCallback } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../../../../store";
import { useOverwriteCanvasFromRemoteMutation } from "../../../slices";

interface SyncFromRemoteButtonProps {}

export const SyncFromRemoteButton: FC<SyncFromRemoteButtonProps> = () => {
  const dataflowId = useSelector((state: RootState) => state.flow.dataflowId);
  const [overwriteFromRemote, { isLoading }] = useOverwriteCanvasFromRemoteMutation();

  const handleSyncClick = useCallback(async () => {
    if (!dataflowId) {
      return;
    }

    try {
      const result = await overwriteFromRemote({ id: dataflowId }).unwrap();
      
      if (result.overwritten) {
        console.log(`Successfully synced from remote. Updated to version ${result.newVersion}`);
      } else {
        console.log(result.message);
      }
    } catch (error: any) {
      console.error("Failed to sync from remote:", error);
    }
  }, [dataflowId, overwriteFromRemote]);

  if (!dataflowId) {
    return null;
  }

  return (
    <Button
      variant="outlined"
      startIcon={<Sync />}
      onClick={handleSyncClick}
      disabled={isLoading}
      text={isLoading ? "Syncing..." : "Sync from Remote"}
      size="small"
    />
  );
};