import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import React, { ChangeEvent, FC, useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { NodeProps } from "reactflow";
import FormHelperText from "@mui/material/FormHelperText";
import { Box, Checkbox, TextInput } from "@portal/components";
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
import { FhirMappingNodeData } from "./FhirMappingNode";

export interface FhirMappingDrawerProps
  extends Omit<NodeDrawerProps, "children"> {
  node: NodeProps<FhirMappingNodeData>;
  onClose: () => void;
}

interface FormData extends FhirMappingNodeData {}

interface FormError {
  name: { duplicate: boolean };
}

const EMPTY_FORM_DATA: FormData = {
  name: "",
  description: "",
  database_code: "",
  schema_name: "",
  omop_table_name: "",
  fhir_resource_type: "",
  write_key_map: true,
  source_value_col: "",
};

const EMPTY_FORM_ERROR: FormError = {
  name: { duplicate: false },
};

export const FhirMappingDrawer: FC<FhirMappingDrawerProps> = ({
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
        omop_table_name: node.data.omop_table_name,
        fhir_resource_type: node.data.fhir_resource_type,
        write_key_map: node.data.write_key_map ?? true,
        source_value_col: node.data.source_value_col ?? `${node.data.omop_table_name}_source_value`,
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
    const updated: NodeState<FhirMappingNodeData> = {
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
        <TextInput
          label="FHIR resource type"
          value={formData.fhir_resource_type}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({ fhir_resource_type: e.target.value })
          }
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
      <Box mb={4}>
        <TextInput
          label="OMOP table name"
          value={formData.omop_table_name}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({
              omop_table_name: e.target.value,
              source_value_col: formData.source_value_col === `${formData.omop_table_name}_source_value`
                ? `${e.target.value}_source_value`
                : formData.source_value_col,
            })
          }
        />
      </Box>
      <Box mb={4}>
        <TextInput
          label="FHIR ID column"
          value={formData.source_value_col}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({ source_value_col: e.target.value })
          }
        />
      </Box>
      <Box mb={4}>
        <Checkbox
          label="Write FHIR-OMOP key mapping"
          checked={formData.write_key_map}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({ write_key_map: e.target.checked })
          }
        />
      </Box>
    </NodeDrawer>
  );
};
