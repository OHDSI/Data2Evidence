import React, { FC, useCallback } from "react";
import { useSelector } from "react-redux";
import { Button } from "@portal/components";
import { RootState, dispatch } from "~/store";
import { setSaveFlowDialog } from "../../../reducers";
import { SaveFlowDialog } from "../SaveFlow/SaveFlowDialog";
import "./EmptyFlow.scss";

export const EmptyFlow: FC = () => {
  const saveFlowDialog = useSelector(
    (state: RootState) => state.flow.saveFlowDialog
  );

  const handleOpen = useCallback(() => {
    dispatch(setSaveFlowDialog({ visible: true, dataflowId: null }));
  }, []);

  const handleClose = useCallback(() => {
    dispatch(setSaveFlowDialog({ visible: false, dataflowId: null }));
  }, []);

  return (
    <div className="empty-flow">
      <div className="empty-flow__title">There is no dataflow to show</div>
      <Button text="Create your first dataflow" onClick={handleOpen} />
      <SaveFlowDialog open={saveFlowDialog.visible} onClose={handleClose} />
    </div>
  );
};
