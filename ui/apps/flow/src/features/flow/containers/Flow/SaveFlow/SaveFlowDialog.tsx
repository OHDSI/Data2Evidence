import {
  Box,
  Button,
  Dialog,
  DialogProps,
  EditNoBoxIcon,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Snackbar,
  TextField,
} from "@portal/components";
import { FetchBaseQueryError } from "@reduxjs/toolkit/dist/query";
import React, {
  ChangeEvent,
  FC,
  useCallback,
  useEffect,
  useState,
} from "react";
import { useSelector } from "react-redux";
import { RootState, dispatch } from "~/store";
import { useFormData } from "../../../hooks";
import {
  markStatusAsSaved,
  selectEdges,
  setAddNodeTypeDialog,
  setDataflowId,
  setRevisionId,
} from "../../../reducers";
import { selectFlowNodes } from "../../../selectors";
import {
  useCreateCanvasFromTemplateMutation,
  useGetLatestDataflowByIdQuery,
  useGetTemplatesQuery,
  useSaveDataflowMutation,
} from "../../../slices";
import { ErrorResponse, SaveDataflowDto } from "../../../types";
import "./SaveFlowDialog.scss";

export interface SaveFlowDialogProps extends DialogProps {}

interface FormData {
  name: string;
  comment: string;
  selectedTemplate: string;
}

const EMPTY_FORM_DATA: FormData = {
  name: "",
  comment: "",
  selectedTemplate: "",
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
  const { data: templates = [], isLoading: templatesLoading } =
    useGetTemplatesQuery(undefined, {
      skip: !isNew,
    });
  const [createFromTemplate, { isLoading: createFromTemplateLoading }] =
    useCreateCanvasFromTemplateMutation();
  const nodes = useSelector(selectFlowNodes);
  const edges = useSelector(selectEdges);
  const variables = useSelector((state: RootState) => state.flow.variables);
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
        setFormData({
          name: dataflow.canvas.name,
          comment: "",
          selectedTemplate: "",
        });
      }

      if (isNew) {
        nameRef && nameRef.focus();
      } else {
        commentRef && commentRef.focus();
      }
    }
  }, [props.open, dataflow, nameRef, commentRef]);

  const handleSave = useCallback(async () => {
    if (isNew && formData.selectedTemplate) {
      // Create from template
      const response = await createFromTemplate({
        templateId: formData.selectedTemplate,
        name: formData.name,
        comment: formData.comment,
      });

      if ("error" in response) {
        setError((response.error as FetchBaseQueryError).data as ErrorResponse);
        return;
      }

      if ("data" in response && response.data?.id) {
        dispatch(setDataflowId(response.data.id));
        dispatch(setRevisionId(undefined));
        dispatch(markStatusAsSaved());
        typeof onClose === "function" && onClose();
      }
    } else {
      // Without template
      const dataflow: SaveDataflowDto = {
        id: saveFlowDialog.dataflowId,
        name: formData.name,
        dataflow: isNew
          ? { nodes: [], edges: [], variables: [], comment: formData.comment }
          : { nodes, edges, variables, comment: formData.comment },
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
    }
  }, [
    saveFlowDialog,
    isNew,
    formData,
    nodes,
    edges,
    variables,
    createFromTemplate,
  ]);

  const handleClose = useCallback(() => {
    typeof onClose === "function" && onClose();
  }, [onClose]);

  return (
    <Dialog
      className="save-flow-dialog"
      title={isNew ? "New dataflow" : "Save dataflow"}
      onClose={handleClose}
      {...props}
    >
      <div className="save-flow-dialog__content">
        <Snackbar
          type="error"
          message={error?.message}
          visible={error?.statusCode === 400 || !!error?.message}
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
        {isNew && (
          <Box mb={4}>
            <InputLabel sx={{ mb: 1 }}>Template (Optional)</InputLabel>
            <Select
              sx={{ width: "100%" }}
              variant="standard"
              value={formData.selectedTemplate}
              onChange={(e: SelectChangeEvent) =>
                onFormDataChange({ selectedTemplate: e.target.value })
              }
              displayEmpty
              disabled={templatesLoading}
            >
              <MenuItem value="">
                <em>No template</em>
              </MenuItem>
              {templates.map((template) => (
                <MenuItem key={template.id} value={template.id}>
                  {template.name} - {template.description}
                </MenuItem>
              ))}
            </Select>
          </Box>
        )}
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
            loading={isLoading || createFromTemplateLoading}
          />
        </Box>
      </div>
    </Dialog>
  );
};
