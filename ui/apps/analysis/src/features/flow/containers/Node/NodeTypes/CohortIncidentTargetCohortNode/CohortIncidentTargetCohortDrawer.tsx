import React, { ChangeEvent, FC, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import { NodeProps } from "reactflow";
import { Box, TextInput } from "@portal/components";
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
import { CohortIncidentTargetCohortNodeData } from "./CohortIncidentTargetCohortNode";

export interface CohortIncidentTargetCohortDrawerProps
  extends Omit<NodeDrawerProps, "children"> {
  node: NodeProps<CohortIncidentTargetCohortNodeData>;
  onClose: () => void;
}

interface FormData extends CohortIncidentTargetCohortNodeData {}

const EMPTY_FORM_DATA: FormData = {
  name: "",
  description: "",
  defId: 1,
  defName: "",
  cohortId: 3,
  cleanWindow: 9999,
};

export const CohortIncidentTargetCohortDrawer: FC<
  CohortIncidentTargetCohortDrawerProps
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
        defId: node.data.defId,
        defName: node.data.defName,
        cohortId: node.data.cohortId,
        cleanWindow: node.data.cleanWindow,
      });
    } else {
      setFormData({
        ...EMPTY_FORM_DATA,
        ...NodeChoiceMap["cohort_generator_node"].defaultData,
      });
    }
  }, [node.data]);

  const handleOk = useCallback(() => {
    const updated: NodeState<CohortIncidentTargetCohortNodeData> = {
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
        <TextInput
          label="Def ID"
          value={formData.defId}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({ defId: e.target.value })
          }
          type="number"
        />
      </Box>
      <Box mb={4}>
        <TextInput
          label="Def Name"
          value={formData.defName}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({ defName: e.target.value })
          }
        />
      </Box>
      <Box mb={4}>
        <TextInput
          label="Cohort ID"
          value={formData.cohortId}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({ cohortId: e.target.value })
          }
          type="number"
        />
      </Box>
      <Box mb={4}>
        <TextInput
          label="Clean Window"
          value={formData.cleanWindow}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({ cleanWindow: e.target.value })
          }
          type="number"
        />
      </Box>
    </NodeDrawer>
  );
};
