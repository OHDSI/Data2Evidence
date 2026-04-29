import React, { FC, useCallback } from "react";
import { Box, Button, Dialog, DialogProps } from "@portal/components";
import { useSelector } from "react-redux";
import { RootState, dispatch } from "~/store";
import { useDeleteDataflowRevisionMutation } from "../../../slices";
import { clearStatus, setRevisionId } from "../../../reducers";
import "./DeleteFlowRevisionDialog.scss";

export interface DeleteFlowRevisionDialogProps extends DialogProps {}

export const DeleteFlowRevisionDialog: FC<DeleteFlowRevisionDialogProps> = ({
  onClose,
  ...props
}) => {
  const [deleteDataflowRevision, { isLoading }] =
    useDeleteDataflowRevisionMutation();
  const dataflowId = useSelector((state: RootState) => state.flow.dataflowId);
  const revisionId = useSelector((state: RootState) => state.flow.revisionId);

  const handleDelete = useCallback(async () => {
    await deleteDataflowRevision({ id: dataflowId, revisionId });
    dispatch(setRevisionId(undefined));
    dispatch(clearStatus());
    typeof onClose === "function" && onClose();
  }, [dataflowId, revisionId, onClose]);

  const handleClose = useCallback(() => {
    typeof onClose === "function" && onClose();
  }, [onClose]);

  return (
    <Dialog
      className="delete-flow-revision-dialog"
      title="Delete dataflow version"
      onClose={handleClose}
      {...props}
    >
      <div className="delete-flow-revision-dialog__content">
        <Box mb={4}>Delete the selected version?</Box>
      </div>
      <div className="delete-flow-revision-dialog__footer">
        <Box
          display="flex"
          gap={1}
          className="delete-flow-revision-dialog__footer-actions"
        >
          <Button text="Cancel" variant="outlined" onClick={handleClose} />
          <Button text="Delete" onClick={handleDelete} loading={isLoading} />
        </Box>
      </div>
    </Dialog>
  );
};
