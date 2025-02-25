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
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextField,
  TextInput,
} from "@portal/components";
import { useFormData } from "~/features/flow/hooks";
import {
  markStatusAsDraft,
  selectNodeById,
  setNode,
} from "~/features/flow/reducers";
import { KeyValue, NodeState } from "~/features/flow/types";
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
};

export const CsvDrawer: FC<CsvDrawerProps> = ({ node, onClose, ...props }) => {
  const [selectedFile, setSelectedFile] = useState<File>();
  const hiddenFileInput = useRef<HTMLInputElement>(null);

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
    (e: ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length == 0) return;

      const file = e.target.files[0];
      setSelectedFile(file);
      onFormDataChange({ file: file.name });
    },
    [onFormDataChange]
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
          text="Choose file"
          onClick={handleAddFile}
          style={{ marginRight: 7 }}
        />
        <div>{selectedFile?.name}</div>
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
        />
      </Box>
      <Box mb={4}>
        <FormControl variant="standard" fullWidth>
          <InputLabel shrink>Delimiter</InputLabel>
          <Select
            value={formData.delimiter}
            onChange={(e: SelectChangeEvent) =>
              onFormDataChange({ delimiter: e.target.value })
            }
          >
            <MenuItem value="">&nbsp;</MenuItem>
            {DelimiterOptions.map((option) => (
              <MenuItem key={option.key} value={option.key}>
                {option.value}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
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
      <Box mb={4}>
        <Autocomplete<string, true, undefined, true>
          multiple
          freeSolo
          options={[]}
          value={formData.columns}
          onChange={(event, columns: string[]) => onFormDataChange({ columns })}
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
    </NodeDrawer>
  );
};
