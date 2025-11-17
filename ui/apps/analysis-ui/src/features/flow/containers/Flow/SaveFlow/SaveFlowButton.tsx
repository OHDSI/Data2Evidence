import React, { FC, useCallback } from "react";
import { useSelector } from "react-redux";
import { Button, Chip } from "@portal/components";
import { RootState, dispatch } from "~/store";
import { SaveFlowDialog } from "./SaveFlowDialog";
import { setSaveFlowDialog } from "~/features/flow/reducers";

export const SaveFlowButton: FC = () => {
  const saveFlowDialog = useSelector(
    (state: RootState) => state.flow.saveFlowDialog
  );
  const dataflowId = useSelector((state: RootState) => state.flow.dataflowId);
  const status = useSelector((state: RootState) => state.flow.status);

  const handleOpen = useCallback(() => {
    dispatch(setSaveFlowDialog({ visible: true, dataflowId }));
  }, [dataflowId]);

  const handleClose = useCallback(() => {
    dispatch(setSaveFlowDialog({ visible: false, dataflowId }));
  }, [dataflowId]);

  return (
    <>
      {status && <Chip variant="filled" size="small" label={status} />}
      <Button text="Save" onClick={handleOpen} />
      <SaveFlowDialog open={saveFlowDialog.visible} onClose={handleClose} />
    </>
  );
};
