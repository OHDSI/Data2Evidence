import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import React, { ChangeEvent, FC, useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { NodeProps } from "reactflow";
import FormHelperText from "@mui/material/FormHelperText";
import { Box, TextInput } from "@portal/components";
import { useFormData } from "~/features/flow/hooks";
import {
  markStatusAsDraft,
  selectNodeById,
  selectNodes,
  setNode,
} from "~/features/flow/reducers";
import { NodeState } from "~/features/flow/types";
import { isDuplicateNodeName } from "~/features/flow/utils";
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

interface FormError {
  name: { duplicate: boolean };
}

const EMPTY_FORM_DATA: FormData = {
  name: "",
  description: "",
  database: "",
  schemaname: "",
  dataframe: "",
  dbtablename: "",
  truncate: false,
};

const EMPTY_FORM_ERROR: FormError = {
  name: { duplicate: false },
};

export const DbWriterDrawer: FC<DbWriterDrawerProps> = ({
  node,
  onClose,
  ...props
}) => {
  const { formData, setFormData, onFormDataChange } =
    useFormData<FormData>(EMPTY_FORM_DATA);
  const databases = useSelector((state: RootState) => state.flow.databases);
  const nodeState = useSelector((state: RootState) =>
    selectNodeById(state, node.id),
  );
  const [formError, setFormError] = useState<FormError>(EMPTY_FORM_ERROR);
  const allNodes = useSelector(selectNodes);

  useEffect(() => {
    if (node.data) {
      setFormData({
        name: node.data.name,
        description: node.data.description,
        dataframe: node.data.dataframe,
        dbtablename: node.data.dbtablename,
        database: node.data.database,
        schemaname: node.data.schemaname,
        truncate: node.data.truncate ?? false,
      });
    } else {
      setFormData({
        ...EMPTY_FORM_DATA,
        ...NodeChoiceMap["db_writer_node"].defaultData,
      });
    }
  }, [node.data]);

  const handleDatabaseVariableChange = useCallback(
    (variableName: string) => {
      const selectedDb = databases.find((db) => db.name === variableName);
      onFormDataChange({
        database: variableName,
        schemaname: selectedDb?.schema ?? "",
      });
    },
    [databases, onFormDataChange]
  );

  const handleOk = useCallback(() => {
    if (isDuplicateNodeName(allNodes, node.id, formData.name)) {
      setFormError({ name: { duplicate: true } });
      return;
    }
    setFormError(EMPTY_FORM_ERROR);
    const updated: NodeState<DbWriterNodeData> = {
      ...nodeState,
      data: formData,
    };
    dispatch(setNode(updated));
    dispatch(markStatusAsDraft());

    typeof onClose === "function" && onClose();
  }, [formData, allNodes, node.id, nodeState, onClose]);

  const handleClose = useCallback(() => {
    setFormError(EMPTY_FORM_ERROR);
    typeof onClose === "function" && onClose();
  }, [onClose]);

  return (
    <NodeDrawer {...props} onOk={handleOk} onClose={handleClose}>
      <Box mb={4}>
        <TextInput
          label="Name"
          value={formData.name}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({ name: e.target.value })
          }
        />
        {formError.name.duplicate && (
          <FormHelperText error>
            Duplicate node name exists, please use another name
          </FormHelperText>
        )}
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
              handleDatabaseVariableChange(e.target.value)
            }
            disabled={databases.length === 0}
          >
            {databases.length === 0 ? (
              <MenuItem value="" disabled>
                No databases configured — add them in Variables
              </MenuItem>
            ) : (
              databases.map((db) => (
                <MenuItem key={db.name} value={db.name}>
                  {db.name} ({db.code} / {db.schema})
                </MenuItem>
              ))
            )}
          </Select>
          {databases.length === 0 && (
            <FormHelperText>
              Configure database variables in the Variables panel first.
            </FormHelperText>
          )}
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
      <Box mb={4}>
        <FormControlLabel
          control={
            <Checkbox
              checked={formData.truncate}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onFormDataChange({ truncate: e.target.checked })
              }
            />
          }
          label="Truncate table before writing"
        />
      </Box>
    </NodeDrawer>
  );
};
