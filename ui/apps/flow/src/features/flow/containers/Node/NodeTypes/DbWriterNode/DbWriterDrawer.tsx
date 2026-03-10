import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import React, { ChangeEvent, FC, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import { NodeProps } from "reactflow";
import { Box, TextInput } from "@portal/components";
import { useFormData } from "~/features/flow/hooks";
import { useGetDatabasesQuery } from "~/features/flow/slices";
import {
  markStatusAsDraft,
  selectNodeById,
  setNode,
} from "~/features/flow/reducers";
import { NodeState } from "~/features/flow/types";
import { RootState, dispatch } from "~/store";
import { NodeDrawer, NodeDrawerProps } from "../../NodeDrawer/NodeDrawer";
import { SelectSource } from "../../SelectSource/SelectSource";
import { NodeChoiceMap } from "../../NodeTypes";
import { DbWriterNodeData } from "./DbWriterNode";

export interface DbWriterDrawerProps extends Omit<NodeDrawerProps, "children"> {
  node: NodeProps<DbWriterNodeData>;
  onClose: () => void;
}

interface FormData extends DbWriterNodeData {}

const EMPTY_FORM_DATA: FormData = {
  name: "",
  description: "",
  database: "",
  schemaname: "",
  dataframe: "",
  dbtablename: "",
};

export const DbWriterDrawer: FC<DbWriterDrawerProps> = ({
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
        dataframe: node.data.dataframe,
        dbtablename: node.data.dbtablename,
        database: node.data.database,
        schemaname: node.data.schemaname,
      });
    } else {
      setFormData({
        ...EMPTY_FORM_DATA,
        ...NodeChoiceMap["db_writer_node"].defaultData,
      });
    }
  }, [node.data]);

  const handleOk = useCallback(() => {
    const updated: NodeState<DbWriterNodeData> = {
      ...nodeState,
      data: formData,
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
        <SelectSource
          nodeId={node.id}
          sourceOptions={null}
          label="Dataframe"
          value={formData.dataframe}
          onChange={(dataframe: string) => onFormDataChange({ dataframe })}
        />
      </Box>
      <Box mb={4}>
        <TextInput
          label="Database table name"
          value={formData.dbtablename}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({ dbtablename: e.target.value })
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
      <Box mb={4}>
        <TextInput
          label="Schema name"
          value={formData.schemaname}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({ schemaname: e.target.value })
          }
        />
      </Box>
    </NodeDrawer>
  );
};
