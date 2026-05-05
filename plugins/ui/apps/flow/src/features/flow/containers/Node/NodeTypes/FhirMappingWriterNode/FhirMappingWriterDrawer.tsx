import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import React, { ChangeEvent, FC, useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { NodeProps } from "reactflow";
import FormHelperText from "@mui/material/FormHelperText";
import { Box, TextInput } from "@portal/components";
import { useFormData } from "~/features/flow/hooks";
import { useGetDatabasesQuery } from "~/features/flow/slices";
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
import { FhirMappingWriterNodeData } from "./FhirMappingWriterNode";

export interface FhirMappingWriterDrawerProps
  extends Omit<NodeDrawerProps, "children"> {
  node: NodeProps<FhirMappingWriterNodeData>;
  onClose: () => void;
}

interface FormData extends FhirMappingWriterNodeData {}

interface FormError {
  name: { duplicate: boolean };
}

const EMPTY_FORM_DATA: FormData = {
  name: "",
  description: "",
  database_code: "",
  schema_name: "",
  source_node: "",
};

const EMPTY_FORM_ERROR: FormError = {
  name: { duplicate: false },
};

export const FhirMappingWriterDrawer: FC<FhirMappingWriterDrawerProps> = ({
  node,
  onClose,
  ...props
}) => {
  const { formData, setFormData, onFormDataChange } =
    useFormData<FormData>(EMPTY_FORM_DATA);
  const { data: databases = [], isLoading: isLoadingDatabases } =
    useGetDatabasesQuery();
  const nodeState = useSelector((state: RootState) =>
    selectNodeById(state, node.id)
  );
  const [formError, setFormError] = useState<FormError>(EMPTY_FORM_ERROR);
  const allNodes = useSelector(selectNodes);

  useEffect(() => {
    if (node.data) {
      setFormData({
        name: node.data.name,
        description: node.data.description,
        database_code: node.data.database_code,
        schema_name: node.data.schema_name,
        source_node: node.data.source_node,
      });
    } else {
      setFormData({ ...EMPTY_FORM_DATA });
    }
  }, [node.data]);

  const handleOk = useCallback(() => {
    if (isDuplicateNodeName(allNodes, node.id, formData.name)) {
      setFormError({ name: { duplicate: true } });
      return;
    }
    setFormError(EMPTY_FORM_ERROR);
    const updated: NodeState<FhirMappingWriterNodeData> = {
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
          label="Source node (Transform FHIR Data)"
          value={formData.source_node}
          onChange={(source_node: string) => onFormDataChange({ source_node })}
        />
      </Box>
      <Box mb={4}>
        <FormControl variant="standard" fullWidth>
          <InputLabel>Database</InputLabel>
          <Select
            value={formData.database_code}
            onChange={(e: SelectChangeEvent<string>) =>
              onFormDataChange({ database_code: e.target.value })
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
          label="Schema"
          value={formData.schema_name}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({ schema_name: e.target.value })
          }
        />
      </Box>
    </NodeDrawer>
  );
};
