import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import React, { ChangeEvent, FC, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import { NodeProps } from "reactflow";
import {
  Autocomplete,
  Box,
  Chip,
  TextField,
  TextInput,
} from "@portal/components";
import { Editor } from "~/components/Editor/Editor";
import { useFormData } from "~/features/flow/hooks";
import {
  markStatusAsDraft,
  selectNodeById,
  setNode,
} from "~/features/flow/reducers";
import { NodeState } from "~/features/flow/types";
import { RootState, dispatch } from "~/store";
import { isValid2dArray } from "~/utils";
import { useGetDatabasesQuery } from "~/features/flow/slices";
import { NodeDrawer, NodeDrawerProps } from "../../NodeDrawer/NodeDrawer";
import { NodeChoiceMap } from "../../NodeTypes";
import { DbReaderNodeData } from "./DbReaderNode";

export interface DbReaderDrawerProps extends Omit<NodeDrawerProps, "children"> {
  node: NodeProps<DbReaderNodeData>;
  onClose: () => void;
}

interface FormData extends Omit<DbReaderNodeData, "testdata"> {
  testdata: string;
}

const EMPTY_FORM_DATA: FormData = {
  name: "",
  description: "",
  database: "",
  sqlquery: "",
  columns: [],
  testdata: "[[]]",
};

export const DbReaderDrawer: FC<DbReaderDrawerProps> = ({
  node,
  onClose,
  ...props
}) => {
  const { formData, setFormData, onFormDataChange } =
    useFormData<FormData>(EMPTY_FORM_DATA);
  const { data: databases = [], isLoading: isLoadingDatabases } =
    useGetDatabasesQuery();
  const nodeState = useSelector((state: RootState) =>
    selectNodeById(state, node.id),
  );

  useEffect(() => {
    if (node.data) {
      setFormData({
        name: node.data.name,
        description: node.data.description,
        database: node.data.database,
        sqlquery: node.data.sqlquery,
        columns: node.data.columns,
        testdata: JSON.stringify(node.data.testdata),
      });
    } else {
      setFormData({
        ...EMPTY_FORM_DATA,
        ...NodeChoiceMap["db_reader_node"].defaultData,
      });
    }
  }, [node.data]);

  const handleOk = useCallback(() => {
    let testdata: (string | number | boolean | Date)[][] = [[]];
    if (isValid2dArray(formData.testdata)) {
      testdata = JSON.parse(formData.testdata);
    }

    const updated: NodeState<DbReaderNodeData> = {
      ...nodeState,
      data: { ...formData, testdata },
    };
    dispatch(setNode(updated));
    dispatch(markStatusAsDraft());

    typeof onClose === "function" && onClose();
  }, [formData]);

  return (
    <NodeDrawer {...props} onOk={handleOk} onClose={onClose}>
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
      <Box mb={4}>
        <FormControl variant="standard" fullWidth>
          <InputLabel>Database</InputLabel>
          <Select
            value={formData.database}
            onChange={(e: SelectChangeEvent<string>) =>
              onFormDataChange({ database: e.target.value })
            }
            disabled={isLoadingDatabases}
          >
            {databases.map((db) => (
              <MenuItem key={db.code} value={db.code}>
                {db.code} - {db.dialect}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      <Editor
        language="sql"
        value={formData.sqlquery}
        onChange={(sqlquery: string) => onFormDataChange({ sqlquery })}
        label="SQL query"
      />
      <Box mb={4}>
        <Autocomplete<string, true, undefined, true>
          multiple
          freeSolo
          options={[]}
          value={formData.columns}
          onChange={(_event, columns: string[]) =>
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
      <Editor
        language="json"
        value={formData.testdata}
        onChange={(testdata: string) => onFormDataChange({ testdata })}
        label="Test data"
        boxProps={{ mb: 0 }}
      />
    </NodeDrawer>
  );
};
