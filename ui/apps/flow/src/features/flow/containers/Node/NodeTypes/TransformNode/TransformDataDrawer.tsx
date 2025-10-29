import React, { ChangeEvent, FC, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import { NodeProps } from "reactflow";
import { Box, InputLabel, MenuItem, Select, SelectChangeEvent, TextInput } from "@portal/components";
import { SelectSource } from "../../SelectSource/SelectSource";
import { useFormData } from "~/features/flow/hooks";
import {
  markStatusAsDraft,
  selectNodeById,
  setNode,
} from "~/features/flow/reducers";
import { NodeState } from "~/features/flow/types";
import { RootState, dispatch } from "~/store";
import { NodeDrawer, NodeDrawerProps } from "../../NodeDrawer/NodeDrawer";
import { NodeChoiceMap } from "..";
import { TransformNodeData } from "./TransformDataNode";
import { useGetFhirStructureMapTemplatesQuery } from "~/features/flow/slices";

export interface TransformDataDrawerProps extends Omit<NodeDrawerProps, "children"> {
  node: NodeProps<TransformNodeData>;
  onClose: () => void;
}

interface FormData extends TransformNodeData {}

const EMPTY_FORM_DATA: FormData = {
  name: "",
  description: "",
  structure_map: "",
  output_omop_data: "",
  dataframe: "",
  id:""
};

export const TransformDataDrawer: FC<TransformDataDrawerProps> = ({
  node,
  onClose,
  ...props
}) => {
  const { formData, setFormData, onFormDataChange } =
    useFormData<FormData>(EMPTY_FORM_DATA);
  const nodeState = useSelector((state: RootState) =>
    selectNodeById(state, node.id)
  );
  const { data: structureMapTemplates = [], isLoading: structureMapTemplatesLoading } =
    useGetFhirStructureMapTemplatesQuery(undefined, {
      skip: false,
    });
  useEffect(() => {
    if (node.data) {
        if (node.data.id) {
          const structureMapTemplate = structureMapTemplates.find(
            (map) => map.id === node.data.id
          );
          if (structureMapTemplate) {
            setFormData((prev) => ({
              ...prev,
              structure_map: structureMapTemplate.structureMap,
            }));
          }
        }
      setFormData({
        name: node.data.name,
        description: node.data.description,
        structure_map: node.data.structure_map,
        dataframe: node.data.dataframe,
        output_omop_data: node.data.output_omop_data,
        id: node.data.id,
      });
    } else {
      setFormData({
        ...EMPTY_FORM_DATA,
        ...NodeChoiceMap["python_node"].defaultData,
      });
    }
  }, [node.data]);

  const handleOk = useCallback(() => {
    const updated: NodeState<TransformNodeData> = {
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
          <InputLabel sx={{ mb: 1 }}>Structure Map</InputLabel>
          <Select
            sx={{ width: "100%" }}
            variant="standard"
            value={formData.id}
            onChange={(e: SelectChangeEvent) => {
                const selectedId = e.target.value;
                const selectedTemplate = structureMapTemplates.find(
                  (template) => template.id === selectedId
                );

                onFormDataChange({
                  id: selectedTemplate?.id || "",
                  structure_map: selectedTemplate?.structureMap || "",
                });
              }}
            displayEmpty
            disabled={structureMapTemplatesLoading}
          >
            <MenuItem value="">
              <em>No Structure Map</em>
            </MenuItem>
            {structureMapTemplates.map((template) => (
              <MenuItem key={template.id} value={template.id}>
                {template.name}
              </MenuItem>
            ))}
          </Select>
        </Box>
    </NodeDrawer>
  );
};
