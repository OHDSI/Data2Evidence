import React, {
  ChangeEvent,
  FC,
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  Box,
  Button,
  Dialog,
  DialogProps,
  InputLabel,
  TextField,
} from "@portal/components";
import { useSelector } from "react-redux";
import { RootState, dispatch } from "~/store";
import {
  useDeleteDataflowMutation,
  useGetLatestDataflowByIdQuery,
} from "../../../slices";
import { clearStatus, setDataflowId } from "../../../reducers";
import "./DeleteFlowDialog.scss";

export interface DeleteFlowDialogProps extends DialogProps {}

export const DeleteFlowDialog: FC<DeleteFlowDialogProps> = ({
  onClose,
  ...props
}) => {
  const [confirmText, setConfirmText] = useState("");
  const [deleteDataflow, { isLoading }] = useDeleteDataflowMutation();
  const dataflowId = useSelector((state: RootState) => state.flow.dataflowId);
  const { data: dataflow } = useGetLatestDataflowByIdQuery(dataflowId, {
    skip: !dataflowId,
  });

  useEffect(() => {
    if (props.open) setConfirmText("");
  }, [props.open]);

  const handleDelete = useCallback(async () => {
    await deleteDataflow({ id: dataflowId });
    dispatch(setDataflowId(undefined));
    dispatch(clearStatus());
    typeof onClose === "function" && onClose();
  }, [dataflowId, onClose]);

  return (
    <Dialog
      className="delete-flow-dialog"
      title="Delete dataflow"
      onClose={onClose}
      {...props}
    >
      <div className="delete-flow-dialog__content">
        <Box mb={4}>
          Are you sure you want to delete "{dataflow?.canvas.name}" flow?
        </Box>
        <Box mb={4}>
          <InputLabel sx={{ fontSize: 13 }}>
            Type "{dataflow?.canvas.name}" to confirm:
          </InputLabel>
          <TextField
            InputLabelProps={{ shrink: false }}
            fullWidth
            variant="standard"
            value={confirmText}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setConfirmText(e.target.value)
            }
          />
        </Box>
      </div>
      <div className="delete-flow-dialog__footer">
        <Box
          display="flex"
          gap={1}
          className="delete-flow-dialog__footer-actions"
        >
          <Button text="Cancel" variant="outlined" onClick={onClose} />
          <Button
            text="Delete"
            onClick={handleDelete}
            loading={isLoading}
            disabled={confirmText !== dataflow?.canvas.name}
          />
        </Box>
      </div>
    </Dialog>
  );
};
