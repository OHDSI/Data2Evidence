import React, { ChangeEvent, FC, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import { NodeProps } from "reactflow";
import { Box, TextInput, IconButton, AddSquareIcon } from "@portal/components";
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
import { CohortMethodNodeData } from "./CohortMethodNode";
import {
  CohortMethodConfigsForm,
  EMPTY_COHORT_METHOD_CONFIGS_DATA,
} from "./CohortMethodConfigsForm/CohortMethodConfigsForm";

export interface CohortMethodDrawerProps
  extends Omit<NodeDrawerProps, "children"> {
  node: NodeProps<CohortMethodNodeData>;
  onClose: () => void;
}

interface FormData extends CohortMethodNodeData {}

const EMPTY_FORM_DATA: FormData = {
  name: "",
  description: "",
  trueEffectSize: 1,
  priorOutcomeLookback: 30,
  cohortMethodConfigs: [],
};

export const CohortMethodDrawer: FC<CohortMethodDrawerProps> = ({
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
        trueEffectSize: node.data.trueEffectSize,
        priorOutcomeLookback: node.data.priorOutcomeLookback,
        cohortMethodConfigs: node.data.cohortMethodConfigs,
      });
    } else {
      setFormData({
        ...EMPTY_FORM_DATA,
        ...NodeChoiceMap["cohort_method_node"].defaultData,
      });
    }
  }, [node.data]);

  const handleOk = useCallback(() => {
    const updated: NodeState<CohortMethodNodeData> = {
      ...nodeState,
      data: formData,
    };
    dispatch(setNode(updated));
    dispatch(markStatusAsDraft());

    typeof onClose === "function" && onClose();
  }, [formData]);

  const handleRemove = (indexToRemove: number) => {
    setFormData((prevFormData) => ({
      ...prevFormData,
      cohortMethodConfigs: [
        ...prevFormData.cohortMethodConfigs.slice(0, indexToRemove),
        ...prevFormData.cohortMethodConfigs.slice(indexToRemove + 1),
      ],
    }));
  };

  const handleChange = (
    indexToUpdate: number,
    analysisId: string,
    targetId: string
  ) => {
    setFormData((prevFormData) => ({
      ...prevFormData,
      cohortMethodConfigs: [
        ...prevFormData.cohortMethodConfigs.slice(0, indexToUpdate),
        {
          ...prevFormData.cohortMethodConfigs[indexToUpdate],
          analysisId,
          targetId,
        },
        ...prevFormData.cohortMethodConfigs.slice(indexToUpdate + 1),
      ],
    }));
  };

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
      <Box
        mb={4}
        border={"0.5px solid grey"}
        paddingLeft={"20px"}
        paddingTop={"20px"}
      >
        <div style={{ paddingBottom: "20px" }}>Analysis to exclude</div>
        {formData.cohortMethodConfigs.length !== 0 &&
          formData.cohortMethodConfigs.map((data, index) => (
            <CohortMethodConfigsForm
              key={index}
              index={index}
              configs={data}
              onRemove={() => handleRemove(index)}
              onChange={(analysisId: string, targetId: string) =>
                handleChange(index, analysisId, targetId)
              }
            />
          ))}
        <Box mt={2}>
          <IconButton
            startIcon={<AddSquareIcon />}
            title="Add cohort method configuration"
            onClick={() =>
              setFormData((prevFormData) => ({
                ...prevFormData,
                cohortMethodConfigs: [
                  ...prevFormData.cohortMethodConfigs,
                  EMPTY_COHORT_METHOD_CONFIGS_DATA,
                ],
              }))
            }
          />
        </Box>
      </Box>
    </NodeDrawer>
  );
};
