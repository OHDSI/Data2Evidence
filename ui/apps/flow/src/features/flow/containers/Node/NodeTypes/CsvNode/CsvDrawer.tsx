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
import { NodeChoiceMap } from "../../NodeTypes";
import { CsvNodeData } from "./CsvNode";

export interface CsvDrawerProps extends Omit<NodeDrawerProps, "children"> {
  node: NodeProps<CsvNodeData>;
  onClose: () => void;
}

const DelimiterOptions: KeyValue[] = [
  { key: ",", value: "Comma" },
  { key: "/t", value: "Tab" },
];

interface FormData extends CsvNodeData {}

const EMPTY_FORM_DATA: FormData = {
  name: "",
  description: "",
  file: "",
  delimiter: ",",
  hasheader: true,
  columns: [],
  encoding: "utf-8",
};

export const CsvDrawer: FC<CsvDrawerProps> = ({ node, onClose, ...props }) => {
  const [selectedFile, setSelectedFile] = useState<File>();
  const [isUploading, setIsUploading] = useState(false);
  const hiddenFileInput = useRef<HTMLInputElement>(null);

  const [uploadCsvFile] = useUploadNodeCsvFileMutation();
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
        delimiter: node.data.delimiter,
        hasheader: node.data.hasheader,
        columns: node.data.columns,
        encoding: node.data.encoding || "utf-8",
      });
    } else {
      setFormData({
        ...EMPTY_FORM_DATA,
        ...NodeChoiceMap["csv_node"].defaultData,
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
        if (formData.file) {
          await deleteCsvFile({
            nodeId: node.id,
            fileName: formData.file,
          }).unwrap();
        }

        await uploadCsvFile({
          nodeId: node.id,
          file,
        }).unwrap();

        const updatedFormData = { ...formData, file: file.name };
        onFormDataChange({ file: file.name });

        const updatedNode: NodeState<CsvNodeData> = {
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
      uploadCsvFile,
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
    const updated: NodeState<CsvNodeData> = {
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
        {displayFileName && (
          <div>
            {displayFileName}
          </div>
        )}
        <input
          type="file"
          accept=".csv"
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
        <TextInput
          label="Delimiter"
          value={formData.delimiter}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({ delimiter: e.target.value })
          }
          placeholder="e.g. , or ; or \t"
        />
      </Box>
      <Box mb={4}>
        <Checkbox
          checked={formData.hasheader}
          label="Does the CSV has header?"
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({ hasheader: e.target.checked })
          }
        />
      </Box>
      {!formData.hasheader && (
        <Box mb={4}>
          <Autocomplete<string, true, undefined, true>
            multiple
            freeSolo
            options={[]}
            value={formData.columns}
            onChange={(event, columns: string[]) =>
              onFormDataChange({ columns })
            }
            renderInput={(params) => (
              <TextField {...params} label="Columns" variant="standard" />
            )}
            renderTags={(value: string[], getTagProps) =>
              value.map((option: string, index: number) => (
                <Chip
                  key={option}
                  variant="filled"
                  label={option}
                  {...getTagProps({ index })}
                />
              ))
            }
          />
        </Box>
      )}
    </NodeDrawer>
  );
};
