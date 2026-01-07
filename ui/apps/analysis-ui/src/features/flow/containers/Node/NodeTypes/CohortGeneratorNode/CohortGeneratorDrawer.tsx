import React, { ChangeEvent, FC, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import { NodeProps } from "reactflow";
import { Box, Checkbox, TextInput } from "@portal/components";
import { useFormData } from "~/features/flow/hooks";
import {
  markStatusAsDraft,
  selectNodeById,
  setNode,
} from "~/features/flow/reducers";
import { NodeState } from "~/features/flow/types";
import { RootState, dispatch } from "~/store";
import { NodeDrawer, NodeDrawerProps } from "../../NodeDrawer/NodeDrawer";
import { NodeChoiceMap } from "../../NodeTypes";
import { CohortGeneratorNodeData } from "./CohortGeneratorNode";

export interface CohortGeneratorDrawerProps
  extends Omit<NodeDrawerProps, "children"> {
  node: NodeProps<CohortGeneratorNodeData>;
  onClose: () => void;
}

interface FormData extends CohortGeneratorNodeData {}

const EMPTY_FORM_DATA: FormData = {
  name: "",
  description: "",
  incremental: true,
  generateStats: true,
};

export const CohortGeneratorDrawer: FC<CohortGeneratorDrawerProps> = ({
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
        incremental: node.data.incremental,
        generateStats: node.data.generateStats,
      });
    } else {
      setFormData({
        ...EMPTY_FORM_DATA,
        ...NodeChoiceMap["cohort_generator_node"].defaultData,
      });
    }
  }, [node.data]);

  const handleOk = useCallback(() => {
    const updated: NodeState<CohortGeneratorNodeData> = {
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
      <Box mb={4}>
        <Checkbox
          checked={formData.incremental}
          label="Incremental"
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({
              incremental: e.target.checked,
            })
          }
        />
      </Box>
      <Box mb={4}>
        <Checkbox
          checked={formData.generateStats}
          label="GenerateStats"
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({
              generateStats: e.target.checked,
            })
          }
        />
      </Box>
    </NodeDrawer>
  );
};
