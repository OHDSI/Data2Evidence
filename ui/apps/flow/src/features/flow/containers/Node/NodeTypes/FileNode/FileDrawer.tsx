import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  TextField,
  TextInput,
} from "@portal/components";
import React, {
  ChangeEvent,
  FC,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSelector } from "react-redux";
import { NodeProps } from "reactflow";
import { useFormData } from "~/features/flow/hooks";
import {
  markStatusAsDraft,
  markStatusAsSaved,
  selectEdges,
  selectNodeById,
  setNode,
} from "~/features/flow/reducers";
import { selectFlowNodes } from "~/features/flow/selectors";
import {
  useDeleteNodeCsvFileMutation,
  useGetLatestDataflowByIdQuery,
  useSaveDataflowMutation,
  useUploadNodeCsvFileMutation,
} from "~/features/flow/slices/dataflow-slice";
import { KeyValue, NodeState, SaveDataflowDto } from "~/features/flow/types";
import { RootState, dispatch } from "~/store";
import { NodeDrawer, NodeDrawerProps } from "../../NodeDrawer/NodeDrawer";
import { NodeChoiceMap } from "..";
import { FileNodeData } from "./FileNode";

export interface FileDrawerProps extends Omit<NodeDrawerProps, "children"> {
  node: NodeProps<FileNodeData>;
  onClose: () => void;
}

const DelimiterOptions: KeyValue[] = [
  { key: ",", value: "Comma" },
  { key: "/t", value: "Tab" },
];

interface FormData extends FileNodeData {}

const EMPTY_FORM_DATA: FormData = {
  name: "",
  description: "",
  file: [],
  encoding: "utf-8",
};

export const FileDrawer: FC<FileDrawerProps> = ({ node, onClose, ...props }) => {
  const [selectedFile, setSelectedFile] = useState<File>();
  const [isUploading, setIsUploading] = useState(false);
  const hiddenFileInput = useRef<HTMLInputElement>(null);

  const [uploadFile] = useUploadNodeCsvFileMutation();
  const [deleteCsvFile] = useDeleteNodeCsvFileMutation();
  const [saveDataflow] = useSaveDataflowMutation();

  const dataflowId = useSelector((state: RootState) => state.flow.dataflowId);
  const nodes = useSelector(selectFlowNodes);
  const edges = useSelector(selectEdges);

  const { data: dataflow } = useGetLatestDataflowByIdQuery(dataflowId, {
    skip: !dataflowId,
  });

  const { formData, setFormData, onFormDataChange } =
    useFormData<FormData>(EMPTY_FORM_DATA);
  const nodeState = useSelector((state: RootState) =>
    selectNodeById(state, node.id)
  );

  useEffect(() => {
    if (node.data) {
      setFormData({
        name: node.data.name,
        description: node.data.description,
        file: node.data.file,
        encoding: node.data.encoding || "utf-8",
      });
    } else {
      setFormData({
        ...EMPTY_FORM_DATA,
        ...NodeChoiceMap["file_node"].defaultData,
      });
    }
  }, [node.data]);

  const handleAddFile = useCallback(() => {
    if (hiddenFileInput.current !== null) {
      hiddenFileInput.current.click();
    }
  }, [hiddenFileInput]);

  const handleFileChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length == 0) return;

      const file = e.target.files[0];
      setSelectedFile(file);
      setIsUploading(true);

      try {
        // If there's an existing file, delete it first
        if (formData.file && formData.file.length > 0) {
          await deleteCsvFile({
            nodeId: node.id,
            fileName: formData.file[0], // Assuming single file for deletion
          }).unwrap();
        }

        await uploadFile({
          nodeId: node.id,
          file,
        }).unwrap();

        const updatedFormData = { ...formData, 
          files: [...(formData.file || []), file.name],
        };
        onFormDataChange({ file: updatedFormData.file });

        const updatedNode: NodeState<FileNodeData> = {
          ...nodeState,
          data: updatedFormData,
        };
        dispatch(setNode(updatedNode));

        // Auto-save with the updated node data
        const updatedNodes = nodes.map((n) =>
          n.id === node.id ? updatedNode : n
        );

        const dataflowData: SaveDataflowDto = {
          id: dataflowId,
          name: dataflow?.canvas?.name,
          dataflow: {
            ...dataflow?.flow,
            nodes: updatedNodes,
            edges,
            comment: "Auto-saved after CSV upload",
          },
        };

        await saveDataflow(dataflowData);
        dispatch(markStatusAsSaved());
      } catch (error) {
        console.error("File upload failed:", error);
        setSelectedFile(undefined);
      } finally {
        setIsUploading(false);
      }
    },
    [
      onFormDataChange,
      formData,
      node.id,
      uploadFile,
      deleteCsvFile,
      nodeState,
      nodes,
      edges,
      dataflowId,
      saveDataflow,
      dataflow?.canvas?.name,
    ]
  );

  const handleOk = useCallback(() => {
    const updated: NodeState<FileNodeData> = {
      ...nodeState,
      data: formData,
    };
    dispatch(setNode(updated));
    dispatch(markStatusAsDraft());

    typeof onClose === "function" && onClose();
  }, [formData]);

  const displayFileName = selectedFile?.name || formData.file;

  return (
    <NodeDrawer {...props} width="500px" onOk={handleOk} onClose={onClose}>
      <Box mb={4}>
        <TextInput
          label="Name"
          value={formData.name}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({ name: e.target.value })
          }
        />
      </Box>
      <Box mb={4}>
        <TextInput
          label="Description"
          value={formData.description}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({ description: e.target.value })
          }
        />
      </Box>
      <Box mb={4} display="flex" alignItems="center">
        <Button
          type="button"
          text={isUploading ? "Uploading..." : "Choose file"}
          onClick={handleAddFile}
          disabled={isUploading}
          style={{ marginRight: 7 }}
        />
        {displayFileName && <div>{displayFileName}</div>}
        <input
          type="file"
          ref={hiddenFileInput}
          onChange={handleFileChange}
          onClick={() => {
            if (hiddenFileInput.current) {
              hiddenFileInput.current.value = "";
            }
          }}
          style={{ display: "none" }}
          disabled={isUploading}
        />
      </Box>
      <Box mb={4}>
        <Autocomplete<string, false, undefined, true>
          options={["csv", "json"]}
          onChange={(event, value) => onFormDataChange({ file_type: value || "csv" })}
          renderInput={(params) => <TextField {...params} label="File Type" variant="standard" />}
        />
      </Box>
      <Box mb={4}>
        <strong>Uploaded Files:</strong>
        {formData.file && formData.file.length > 0 ? (
          <ul>
            {formData.file.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        ) : (
          <div>No files uploaded yet.</div>
        )}
      </Box>
    </NodeDrawer>
  );
};
