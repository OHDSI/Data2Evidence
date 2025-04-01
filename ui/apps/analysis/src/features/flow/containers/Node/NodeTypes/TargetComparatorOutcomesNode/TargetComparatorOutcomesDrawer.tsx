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
import { TargetComparatorOutcomesNodeData } from "./TargetComparatorOutcomesNode";
import { CONFIGS_USER_INPUT_ARRAY_STYLES } from "../common";

export interface TargetComparatorOutcomesDrawerProps
  extends Omit<NodeDrawerProps, "children"> {
  node: NodeProps<TargetComparatorOutcomesNodeData>;
  onClose: () => void;
}

interface FormData extends TargetComparatorOutcomesNodeData {}

const EMPTY_FORM_DATA: FormData = {
  name: "",
  description: "",
  targetId: 1,
  comparatorId: 1,
  excludedCovariateConceptIds: [],
  includedCovariateConceptIds: [],
};

export const TargetComparatorOutcomesDrawer: FC<
  TargetComparatorOutcomesDrawerProps
> = ({ node, onClose, ...props }) => {
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
        targetId: node.data.targetId,
        comparatorId: node.data.comparatorId,
        excludedCovariateConceptIds: node.data.excludedCovariateConceptIds,
        includedCovariateConceptIds: node.data.includedCovariateConceptIds,
      });
    } else {
      setFormData({
        ...EMPTY_FORM_DATA,
        ...NodeChoiceMap["target_comparator_outcomes_node"].defaultData,
      });
    }
  }, [node.data]);

  const handleOk = useCallback(() => {
    const updated: NodeState<TargetComparatorOutcomesNodeData> = {
      ...nodeState,
      data: formData,
    };
    dispatch(setNode(updated));
    dispatch(markStatusAsDraft());

    typeof onClose === "function" && onClose();
  }, [formData]);

  const handleExcludedCovariateConceptIdsChange = useCallback(
    (event: any, value: string[]) => {
      onFormDataChange({ excludedCovariateConceptIds: value });
    },
    []
  );

  const handleIncludedCovariateConceptIdsChange = useCallback(
    (event: any, value: string[]) => {
      onFormDataChange({ includedCovariateConceptIds: value });
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
        <TextInput
          label="targetId"
          value={formData.targetId}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({ targetId: e.target.value })
          }
          type="number"
        />
      </Box>
      <Box mb={4}>
        <TextInput
          label="comparatorId"
          value={formData.comparatorId}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({ comparatorId: e.target.value })
          }
          type="number"
        />
      </Box>
      <Box mb={4}>
        <Autocomplete
          multiple
          sx={CONFIGS_USER_INPUT_ARRAY_STYLES}
          value={formData.excludedCovariateConceptIds}
          onChange={handleExcludedCovariateConceptIdsChange}
          options={[]}
          freeSolo
          renderInput={(params) => (
            <TextField
              {...params}
              label="ExcludedCovariateConceptIds"
              placeholder="Enter Excluded Covariate Concept ID"
            />
          )}
        />
      </Box>
      <Box mb={4}>
        <Autocomplete
          multiple
          sx={CONFIGS_USER_INPUT_ARRAY_STYLES}
          value={formData.includedCovariateConceptIds}
          onChange={handleIncludedCovariateConceptIdsChange}
          options={[]}
          freeSolo
          renderInput={(params) => (
            <TextField
              {...params}
              label="IncludedCovariateConceptIds"
              placeholder="Enter Included Covariate Concept ID"
            />
          )}
        />
      </Box>
    </NodeDrawer>
  );
};
