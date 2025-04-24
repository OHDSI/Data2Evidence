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
  EditNoBoxIcon,
  IconButton,
  InputLabel,
  Snackbar,
  TextField,
} from "@portal/components";
import { useSelector } from "react-redux";
import { FetchBaseQueryError } from "@reduxjs/toolkit/dist/query";
import { RootState, dispatch } from "~/store";
import {
  useGetLatestDataflowByIdQuery,
  useSaveDataflowMutation,
} from "../../../slices";
import { useFormData } from "../../../hooks";
import { selectFlowNodes } from "../../../selectors";
import {
  markStatusAsSaved,
  selectEdges,
  setAddNodeTypeDialog,
  setDataflowId,
  setRevisionId,
} from "../../../reducers";
import { ErrorResponse, SaveDataflowDto } from "../../../types";
import "./SaveFlowDialog.scss";

export interface SaveFlowDialogProps extends DialogProps {}

interface FormData {
  name: string;
  comment: string;
}

const EMPTY_FORM_DATA: FormData = {
  name: "",
  comment: "",
};

export const SaveFlowDialog: FC<SaveFlowDialogProps> = ({
  onClose,
  ...props
}) => {
  const saveFlowDialog = useSelector(
    (state: RootState) => state.flow.saveFlowDialog
  );
  const isNew = saveFlowDialog.dataflowId == null;
  const { data: dataflow } = useGetLatestDataflowByIdQuery(
    saveFlowDialog.dataflowId,
    { skip: !saveFlowDialog.dataflowId }
  );
  const [saveDataflow, { isLoading }] = useSaveDataflowMutation();
  const nodes = useSelector(selectFlowNodes);
  const edges = useSelector(selectEdges);
  const revisionId = useSelector((state: RootState) => state.flow.revisionId);
  const { formData, setFormData, onFormDataChange } =
    useFormData<FormData>(EMPTY_FORM_DATA);
  const [editName, setEditName] = useState(false);
  const [nameRef, setNameRef] = useState<any>();
  const [commentRef, setCommentRef] = useState<any>();
  const [error, setError] = useState<ErrorResponse>();

  useEffect(() => {
    if (props.open) {
      setError(undefined);
      setEditName(false);
    }
  }, [props.open]);

  useEffect(() => {
    if (props.open) {
      if (isNew || !dataflow) {
        onFormDataChange(EMPTY_FORM_DATA);
      } else {
        setFormData({ name: dataflow.name, comment: "" });
      }

      if (isNew) {
        nameRef && nameRef.focus();
      } else {
        commentRef && commentRef.focus();
      }
    }
  }, [props.open, dataflow, nameRef, commentRef]);

  const handleSave = useCallback(async () => {
    const dataflow: SaveDataflowDto = {
      id: saveFlowDialog.dataflowId,
      name: formData.name,
      dataflow: isNew
        ? { nodes: [], edges: [], comment: formData.comment }
        : { nodes, edges, comment: formData.comment },
    };
    const response = await saveDataflow(dataflow);

    if ("error" in response) {
      setError((response.error as FetchBaseQueryError).data as ErrorResponse);
      return;
    }

    if (isNew && "data" in response) {
      if (response.data?.id) {
        dispatch(setDataflowId(response.data.id));
        dispatch(setAddNodeTypeDialog({ visible: true }));
      }
    }

    dispatch(setRevisionId(undefined));
    dispatch(markStatusAsSaved());
    typeof onClose === "function" && onClose();
  }, [saveFlowDialog, isNew, formData, nodes, edges]);

  const handleClose = useCallback(() => {
    typeof onClose === "function" && onClose();
  }, [onClose]);

  return (
    <Dialog
      className="save-flow-dialog"
      title={isNew ? "New strategus flow" : "Save strategus flow"}
      onClose={handleClose}
      {...props}
    >
      <div className="save-flow-dialog__content">
        <Snackbar
          type="error"
          message={error?.message}
          visible={error?.statusCode === 400}
          handleClose={() => setError(undefined)}
        />
        <Box mb={4}>
          {isNew || editName ? (
            <TextField
              label="Name"
              inputRef={(ref) => setNameRef(ref)}
              sx={{ width: "100%" }}
              variant="standard"
              value={formData.name}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onFormDataChange({ name: e.target.value })
              }
            />
          ) : (
            <div>
              <InputLabel shrink>Name</InputLabel>
              <Box display="flex" gap={1}>
                {formData.name}
                <IconButton
                  startIcon={<EditNoBoxIcon width={16} height={16} />}
                  onClick={() => setEditName(true)}
                />
              </Box>
            </div>
          )}
        </Box>
        <Box mb={4}>
          <TextField
            inputRef={(ref) => setCommentRef(ref)}
            sx={{ width: "100%" }}
            variant="standard"
            label={isNew ? "Comment" : "Describe your changes"}
            value={formData.comment}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onFormDataChange({ comment: e.target.value })
            }
          />
        </Box>
      </div>
      <div className="save-flow-dialog__footer">
        <Box
          display="flex"
          gap={1}
          className="save-flow-dialog__footer-actions"
        >
          <Button text="Cancel" variant="outlined" onClick={handleClose} />
          <Button
            text={isNew ? "Create" : !!revisionId ? "Overwrite latest" : "Save"}
            onClick={handleSave}
            loading={isLoading}
          />
        </Box>
      </div>
    </Dialog>
  );
};
