import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import { FormControlLabel, Radio, RadioGroup } from "@mui/material";
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
  DragEvent,
  FC,
  useCallback,
  useEffect,
  useRef,
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
import { ParsedDataflowContent, parseDataflowJson } from "../../../utils";
import "./SaveFlowDialog.scss";

export interface SaveFlowDialogProps extends DialogProps {}

type CreateMode = "empty" | "template" | "import";

interface FormData {
  name: string;
  comment: string;
  createMode: CreateMode;
  selectedTemplate: string;
}

const EMPTY_FORM_DATA: FormData = {
  name: "",
  comment: "",
  createMode: "empty",
  selectedTemplate: "",
};

interface ImportState {
  loading: boolean;
  fileName: string;
  content?: ParsedDataflowContent;
  error?: string;
}

const EMPTY_IMPORT_STATE: ImportState = { loading: false, fileName: "" };

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
  const importLibs = useSelector((state: RootState) => state.flow.importLibs);
  const databases = useSelector((state: RootState) => state.flow.databases);
  const schemas = useSelector((state: RootState) => state.flow.schemas);
  const revisionId = useSelector((state: RootState) => state.flow.revisionId);
  const { formData, setFormData, onFormDataChange } =
    useFormData<FormData>(EMPTY_FORM_DATA);
  const [editName, setEditName] = useState(false);
  const [nameRef, setNameRef] = useState<any>();
  const [commentRef, setCommentRef] = useState<any>();
  const [error, setError] = useState<ErrorResponse>();
  const [importState, setImportState] =
    useState<ImportState>(EMPTY_IMPORT_STATE);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (props.open) {
      setError(undefined);
      setEditName(false);
      setImportState(EMPTY_IMPORT_STATE);
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
          createMode: "empty",
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

  const handleFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith(".json")) {
      setImportState({
        loading: false,
        fileName: file.name,
        error: "Invalid file. Accepted format: .json",
      });
      return;
    }

    setImportState({ loading: true, fileName: file.name });
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const content = parseDataflowJson(reader.result as string);
        setImportState({ loading: false, fileName: file.name, content });
      } catch (err) {
        console.error("Error parsing JSON:", err);
        setImportState({
          loading: false,
          fileName: file.name,
          error: "The file is invalid or corrupted and cannot be imported",
        });
      }
    };
    reader.onerror = () => {
      setImportState({
        loading: false,
        fileName: file.name,
        error: "The file could not be read",
      });
    };
    reader.readAsText(file);
  }, []);

  const handleFileInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      file && handleFile(file);
    },
    [handleFile]
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const file = event.dataTransfer.files?.[0];
      file && handleFile(file);
    },
    [handleFile]
  );

  const handleSave = useCallback(async () => {
    const trimmedName = formData.name.trim();

    if (!trimmedName) {
      return;
    }

    if (isNew && formData.createMode === "template") {
      // Create from template
      if (!formData.selectedTemplate) {
        return;
      }

      const response = await createFromTemplate({
        templateId: formData.selectedTemplate,
        name: trimmedName,
        comment: formData.comment.trim(),
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
      // Empty flow, imported flow, or save of an existing flow
      const isImport = isNew && formData.createMode === "import";
      if (isImport && !importState.content) {
        return;
      }

      const dataflow: SaveDataflowDto = {
        id: saveFlowDialog.dataflowId,
        name: trimmedName,
        dataflow: isNew
          ? {
              ...(isImport
                ? (importState.content as ParsedDataflowContent)
                : {
                    nodes: [],
                    edges: [],
                    variables: [],
                    importLibs: [],
                    databases: [],
                    schemas: [],
                  }),
              comment: formData.comment.trim(),
            }
          : { nodes, edges, variables, importLibs, databases, schemas, comment: formData.comment.trim() },
      };
      const response = await saveDataflow(dataflow);

      if ("error" in response) {
        setError((response.error as FetchBaseQueryError).data as ErrorResponse);
        return;
      }

      if (isNew && "data" in response) {
        if (response.data?.id) {
          dispatch(setDataflowId(response.data.id));
          if (!isImport) {
            dispatch(setAddNodeTypeDialog({ visible: true }));
          }
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
    importState,
    nodes,
    edges,
    variables,
    importLibs,
    databases,
    schemas,
    createFromTemplate,
    saveDataflow,
    onClose,
  ]);

  const handleClose = useCallback(() => {
    typeof onClose === "function" && onClose();
  }, [onClose]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      handleSave();
    },
    [handleSave]
  );

  const createDisabled =
    !formData.name.trim() ||
    (isNew &&
      ((formData.createMode === "template" && !formData.selectedTemplate) ||
        (formData.createMode === "import" && !importState.content)));

  return (
    <Dialog
      className="save-flow-dialog"
      title={isNew ? "New dataflow" : "Save dataflow"}
      onClose={handleClose}
      {...props}
    >
      <form onSubmit={handleSubmit}>
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
            <RadioGroup
              value={formData.createMode}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onFormDataChange({ createMode: e.target.value as CreateMode })
              }
            >
              <FormControlLabel
                value="empty"
                control={<Radio size="small" />}
                label="Create a new dataflow"
              />
              <FormControlLabel
                value="template"
                control={<Radio size="small" />}
                label="Create from a template"
              />
              <FormControlLabel
                value="import"
                control={<Radio size="small" />}
                label="Import a dataflow"
              />
            </RadioGroup>
          </Box>
        )}
        {isNew && formData.createMode === "template" && (
          <Box mb={4}>
            <InputLabel sx={{ mb: 1 }}>Template</InputLabel>
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
                <em>Select a template</em>
              </MenuItem>
              {templates.map((template) => (
                <MenuItem key={template.id} value={template.id}>
                  {template.name} - {template.description}
                </MenuItem>
              ))}
            </Select>
          </Box>
        )}
        {isNew && formData.createMode === "import" && (
          <Box mb={4}>
            <div
              className="save-flow-dialog__upload"
              onDragOver={(e: DragEvent<HTMLDivElement>) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <UploadFileOutlinedIcon sx={{ width: 28, height: 30 }} />
              <div>
                Drag and drop a file here, or{" "}
                <Button
                  text="Browse"
                  variant="text"
                  onClick={() => fileInputRef.current?.click()}
                  loading={importState.loading}
                />
              </div>
              <div className="save-flow-dialog__upload-hint">
                Accepted format: .json
              </div>
              {importState.content && (
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  gap={0.5}
                  sx={{ color: "success.main" }}
                >
                  <CheckCircleOutlineIcon fontSize="small" />
                  {importState.fileName}
                </Box>
              )}
              {importState.error && (
                <Box sx={{ color: "error.main" }}>{importState.error}</Box>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileInputChange}
              onClick={(event) => {
                (event.target as HTMLInputElement).value = "";
              }}
              style={{ display: "none" }}
              id="open-flow-json"
            />
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
              type="submit"
              disabled={createDisabled}
            />
          </Box>
        </div>
      </form>
    </Dialog>
  );
};
