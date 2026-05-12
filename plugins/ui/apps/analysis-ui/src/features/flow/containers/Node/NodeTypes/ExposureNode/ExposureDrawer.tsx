import React, { ChangeEvent, FC, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import { NodeProps } from "reactflow";
import { Box, TextInput, Autocomplete, TextField } from "@portal/components";
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
import { ExposureNodeData } from "./ExposureNode";
import { CONFIGS_USER_INPUT_ARRAY_STYLES } from "../common";

export interface ExposureDrawerProps extends Omit<NodeDrawerProps, "children"> {
  node: NodeProps<ExposureNodeData>;
  onClose: () => void;
}

interface FormData extends ExposureNodeData {}

const EMPTY_FORM_DATA: FormData = {
  name: "",
  description: "",
  outcomeOfInterestIds: [],
  exposureOfInterestIds: [],
};

export const ExposureDrawer: FC<ExposureDrawerProps> = ({
  node,
  onClose,
  ...props
}) => {
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
        outcomeOfInterestIds: node.data.outcomeOfInterestIds,
        exposureOfInterestIds: node.data.exposureOfInterestIds,
      });
    } else {
      setFormData({
        ...EMPTY_FORM_DATA,
        ...NodeChoiceMap["exposure_node"].defaultData,
      });
    }
  }, [node.data]);

  const handleOk = useCallback(() => {
    const updated: NodeState<ExposureNodeData> = {
      ...nodeState,
      data: formData,
    };
    dispatch(setNode(updated));
    dispatch(markStatusAsDraft());

    typeof onClose === "function" && onClose();
  }, [formData]);

  const handleOutcomeOfInterestIdsChange = useCallback(
    (event: any, value: string[]) => {
      onFormDataChange({ outcomeOfInterestIds: value });
    },
    []
  );

  const handleExposureOfInterestIdsChange = useCallback(
    (event: any, value: string[]) => {
      onFormDataChange({ exposureOfInterestIds: value });
    },
    []
  );

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
      <Box mb={4}>
        <Autocomplete
          multiple
          sx={CONFIGS_USER_INPUT_ARRAY_STYLES}
          value={formData.outcomeOfInterestIds}
          onChange={handleOutcomeOfInterestIdsChange}
          options={[]}
          freeSolo
          renderInput={(params) => (
            <TextField
              {...params}
              label="Outcome of Interest IDs"
              placeholder="Enter Outcome of Interest ID"
            />
          )}
        />
      </Box>
      <Box mb={4}>
        <Autocomplete
          multiple
          sx={CONFIGS_USER_INPUT_ARRAY_STYLES}
          value={formData.exposureOfInterestIds}
          onChange={handleExposureOfInterestIdsChange}
          options={[]}
          freeSolo
          renderInput={(params) => (
            <TextField
              {...params}
              label="Exposure of Interest IDs"
              placeholder="Enter Exposure of Interest ID"
            />
          )}
        />
      </Box>
    </NodeDrawer>
  );
};
