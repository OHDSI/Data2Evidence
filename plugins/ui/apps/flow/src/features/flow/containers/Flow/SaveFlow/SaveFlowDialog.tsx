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
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
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
import { DataflowExportDto, ErrorResponse, SaveDataflowDto } from "../../../types";
import { sanitizeFlowEdges, sanitizeFlowNodes } from "../../../utils";
import "./SaveFlowDialog.scss";

export interface SaveFlowDialogProps extends DialogProps {}

interface FormData {
  name: string;
  comment: string;
  selectedTemplate: string;
}

type AddDataflowMode = "create" | "import";
type UploadState = "idle" | "uploading" | "success" | "error";
type ImportedDataflow = SaveDataflowDto["dataflow"];

const EMPTY_FORM_DATA: FormData = {
  name: "",
  comment: "",
  selectedTemplate: "",
};

const getImportedDataflow = (value: unknown): ImportedDataflow => {
  if (!value || typeof value !== "object") {
    throw new Error("The selected file does not contain a dataflow.");
  }

  const exported = value as Partial<DataflowExportDto>;
  if (!Array.isArray(exported.nodes) || !Array.isArray(exported.edges)) {
    throw new Error("The selected file is not a valid dataflow export.");
  }

  const nodes = sanitizeFlowNodes(exported.nodes);
  const edges = sanitizeFlowEdges(exported.edges, nodes);

  if (exported.nodes.length > 0 && nodes.length === 0) {
    throw new Error("The selected file does not contain valid dataflow nodes.");
  }

  return {
    nodes,
    edges,
    variables: Array.isArray(exported.variables) ? exported.variables : [],
    importLibs: Array.isArray(exported.importLibs) ? exported.importLibs : [],
    databases: Array.isArray(exported.databases) ? exported.databases : [],
    schemas: Array.isArray(exported.schemas) ? exported.schemas : [],
    comment: "",
  };
};

export const SaveFlowDialog: FC<SaveFlowDialogProps> = ({ onClose, ...props }) => {
  const saveFlowDialog = useSelector(
    (state: RootState) => state.flow.saveFlowDialog
  );
  const isNew = saveFlowDialog.dataflowId == null;
  const { data: dataflow } = useGetLatestDataflowByIdQuery(
    saveFlowDialog.dataflowId,
    { skip: !saveFlowDialog.dataflowId }
  );
  const [saveDataflow, { isLoading }] = useSaveDataflowMutation();
  const { data: templates = [], isLoading: templatesLoading } = useGetTemplatesQuery(undefined, {
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
  const { formData, setFormData, onFormDataChange } = useFormData<FormData>(EMPTY_FORM_DATA);
  const [editName, setEditName] = useState(false);
  const [nameRef, setNameRef] = useState<any>();
  const [commentRef, setCommentRef] = useState<any>();
  const [error, setError] = useState<ErrorResponse>();
  const [mode, setMode] = useState<AddDataflowMode>("create");
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadError, setUploadError] = useState<string>();
  const [uploadedFileName, setUploadedFileName] = useState<string>();
  const [importedDataflow, setImportedDataflow] = useState<ImportedDataflow>();
  const [dragActive, setDragActive] = useState(false);
  const hiddenFileInput = useRef<HTMLInputElement>(null);

  const resetAddDataflowState = useCallback(() => {
    setMode("create");
    setUploadState("idle");
    setUploadError(undefined);
    setUploadedFileName(undefined);
    setImportedDataflow(undefined);
    setDragActive(false);
    if (hiddenFileInput.current) hiddenFileInput.current.value = "";
  }, []);

  useEffect(() => {
    if (props.open) {
      setError(undefined);
      setEditName(false);
      resetAddDataflowState();
    }
  }, [props.open, resetAddDataflowState]);

  useEffect(() => {
    if (props.open) {
      if (isNew || !dataflow) {
        onFormDataChange(EMPTY_FORM_DATA);
      } else {
        setFormData({ name: dataflow.canvas.name, comment: "", selectedTemplate: "" });
      }

      if (isNew) {
        nameRef?.focus();
      } else {
        commentRef?.focus();
      }
    }
  }, [props.open, dataflow, isNew, nameRef, commentRef, onFormDataChange, setFormData]);

  const processFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith(".json")) {
      setUploadState("error");
      setUploadError("Choose a JSON dataflow export file.");
      setImportedDataflow(undefined);
      return;
    }

    setUploadState("uploading");
    setUploadError(undefined);
    setUploadedFileName(undefined);
    setImportedDataflow(undefined);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = getImportedDataflow(JSON.parse(String(reader.result)));
        setImportedDataflow(parsed);
        setUploadedFileName(file.name);
        setUploadState("success");
      } catch (fileError) {
        setUploadState("error");
        setUploadError(fileError instanceof Error ? fileError.message : "Unable to read this dataflow export.");
      }
    };
    reader.onerror = () => {
      setUploadState("error");
      setUploadError("Unable to read this dataflow export.");
    };
    reader.readAsText(file);
  }, []);

  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
    event.target.value = "";
  }, [processFile]);

  const handleDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleSave = useCallback(async () => {
    const trimmedName = formData.name.trim();
    if (!trimmedName) return;

    if (isNew && mode === "import" && !importedDataflow) return;

    if (isNew && mode === "create" && formData.selectedTemplate) {
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
        onClose?.();
      }
      return;
    }

    const dataflowPayload: SaveDataflowDto = {
      id: saveFlowDialog.dataflowId,
      name: trimmedName,
      dataflow: isNew
        ? mode === "import"
          ? { ...importedDataflow!, comment: formData.comment.trim() }
          : {
              nodes: [], edges: [], variables: [], importLibs: [], databases: [], schemas: [],
              comment: formData.comment.trim(),
            }
        : { nodes, edges, variables, importLibs, databases, schemas, comment: formData.comment.trim() },
    };
    const response = await saveDataflow(dataflowPayload);
    if ("error" in response) {
      setError((response.error as FetchBaseQueryError).data as ErrorResponse);
      return;
    }

    if (isNew && "data" in response && response.data?.id) {
      dispatch(setDataflowId(response.data.id));
      if (mode === "create") dispatch(setAddNodeTypeDialog({ visible: true }));
    }
    dispatch(setRevisionId(undefined));
    dispatch(markStatusAsSaved());
    onClose?.();
  }, [saveFlowDialog.dataflowId, isNew, mode, formData, importedDataflow, nodes, edges, variables, importLibs, databases, schemas, createFromTemplate, saveDataflow, onClose]);

  const handleClose = useCallback(() => onClose?.(), [onClose]);
  const handleSubmit = useCallback((event: React.FormEvent) => {
    event.preventDefault();
    handleSave();
  }, [handleSave]);
  const confirmationDisabled = !formData.name.trim() || (isNew && mode === "import" && uploadState !== "success");

  return (
    <Dialog
      className="save-flow-dialog"
      title={isNew ? "Add Dataflow" : "Save dataflow"}
      onClose={handleClose}
      {...props}
    >
      <form className="save-flow-dialog__form" onSubmit={handleSubmit}>
        <div className="save-flow-dialog__content">
          <Snackbar type="error" message={error?.message} visible={error?.statusCode === 400 || !!error?.message} handleClose={() => setError(undefined)} />
          {isNew || editName ? (
            <TextField label="Name" inputRef={setNameRef} sx={{ width: "100%" }} variant="standard" value={formData.name} onChange={(event: ChangeEvent<HTMLInputElement>) => onFormDataChange({ name: event.target.value })} />
          ) : (
            <div>
              <InputLabel shrink>Name</InputLabel>
              <Box display="flex" gap={1}>{formData.name}<IconButton startIcon={<EditNoBoxIcon width={16} height={16} />} onClick={() => setEditName(true)} /></Box>
            </div>
          )}
          <TextField inputRef={setCommentRef} sx={{ width: "100%" }} variant="standard" label={isNew ? "Comment" : "Describe your changes"} value={formData.comment} onChange={(event: ChangeEvent<HTMLInputElement>) => onFormDataChange({ comment: event.target.value })} />

          {isNew && (
            <>
              <fieldset className="save-flow-dialog__mode">
                <legend>Dataflow type</legend>
                <label><input type="radio" name="add-dataflow-mode" value="create" checked={mode === "create"} onChange={() => setMode("create")} />Create a new dataflow</label>
                <label><input type="radio" name="add-dataflow-mode" value="import" checked={mode === "import"} onChange={() => setMode("import")} />Import a dataflow</label>
              </fieldset>
              {mode === "create" ? (
                <div>
                  <InputLabel sx={{ mb: 1 }}>Template (Optional)</InputLabel>
                  <Select sx={{ width: "100%" }} variant="standard" value={formData.selectedTemplate} onChange={(event: SelectChangeEvent) => onFormDataChange({ selectedTemplate: event.target.value })} displayEmpty disabled={templatesLoading}>
                    <MenuItem value=""><em>No template</em></MenuItem>
                    {templates.map((template) => <MenuItem key={template.id} value={template.id}>{template.name} - {template.description}</MenuItem>)}
                  </Select>
                </div>
              ) : (
                <div className="save-flow-dialog__upload">
                  <input ref={hiddenFileInput} className="save-flow-dialog__file-input" type="file" accept=".json,application/json" onChange={handleFileChange} />
                  <div className={`save-flow-dialog__drop-zone save-flow-dialog__drop-zone--${uploadState}${dragActive ? " save-flow-dialog__drop-zone--active" : ""}`} role="button" tabIndex={0} onClick={() => hiddenFileInput.current?.click()} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") hiddenFileInput.current?.click(); }} onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { event.preventDefault(); setDragActive(false); }} onDrop={handleDrop}>
                    {uploadState === "success" ? <CheckCircleOutlineIcon /> : uploadState === "error" ? <ErrorOutlineIcon /> : <UploadFileOutlinedIcon />}
                    <div>{uploadState === "uploading" ? "Uploading dataflow…" : uploadState === "success" ? uploadedFileName : uploadState === "error" ? uploadError : <>Add by importing <button type="button" onClick={(event) => { event.stopPropagation(); hiddenFileInput.current?.click(); }}>Browse</button> or drag and drop</>}</div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <div className="save-flow-dialog__footer">
          <Box display="flex" gap={1} className="save-flow-dialog__footer-actions">
            <Button text="Cancel" variant="outlined" onClick={handleClose} disabled={isLoading || createFromTemplateLoading} />
            <Button text={isNew ? mode === "import" ? "Import" : "Create" : !!revisionId ? "Overwrite latest" : "Save"} loading={isLoading || createFromTemplateLoading} type="submit" disabled={confirmationDisabled} />
          </Box>
        </div>
      </form>
    </Dialog>
  );
};
