import React, { ChangeEvent, FC, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import { NodeProps } from "reactflow";
import {
  Box,
  TextInput,
  Autocomplete,
  TextField,
  IconButton,
  AddSquareIcon,
} from "@portal/components";
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
import { CharacterizationNodeData } from "./CharacterizationNode";
import {
  TimeAtRiskConfigsForm,
  EMPTY_TIMEATRISK_FORM_DATA,
} from "./TimeAtRiskConfigsForm/TimeAtRiskConfigsForm";
import { CONFIGS_USER_INPUT_ARRAY_STYLES } from "../common";

export interface CharacterizationDrawerProps
  extends Omit<NodeDrawerProps, "children"> {
  node: NodeProps<CharacterizationNodeData>;
  onClose: () => void;
}

interface FormData extends CharacterizationNodeData {}

const EMPTY_FORM_DATA: FormData = {
  name: "",
  description: "",
  dechallengeStopInterval: 0,
  dechallengeEvaluationWindow: 0,
  minPriorObservation: 0,
  targetIds: ["1", "2"],
  outcomeIds: ["3", "2"],
  timeAtRiskConfigs: [
    {
      riskWindowStart: 1,
      riskWindowEnd: 1,
      startAnchor: "cohort start",
      endAnchor: "cohort end",
    },
  ],
};

export const CharacterizationDrawer: FC<CharacterizationDrawerProps> = ({
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
        dechallengeStopInterval: node.data.dechallengeStopInterval,
        dechallengeEvaluationWindow: node.data.dechallengeEvaluationWindow,
        minPriorObservation: node.data.minPriorObservation,
        targetIds: node.data.targetIds,
        outcomeIds: node.data.outcomeIds,
        timeAtRiskConfigs: node.data.timeAtRiskConfigs,
      });
    } else {
      setFormData({
        ...EMPTY_FORM_DATA,
        ...NodeChoiceMap["characterization_node"].defaultData,
      });
    }
  }, [node.data]);

  const handleOk = useCallback(() => {
    const updated: NodeState<CharacterizationNodeData> = {
      ...nodeState,
      data: formData,
    };
    dispatch(setNode(updated));
    dispatch(markStatusAsDraft());

    typeof onClose === "function" && onClose();
  }, [formData]);

  const handleTargetIdsChange = useCallback((event: any, value: string[]) => {
    onFormDataChange({ targetIds: value });
  }, []);

  const handleOutcomeIdsChange = useCallback((event: any, value: string[]) => {
    onFormDataChange({ outcomeIds: value });
  }, []);

  const handleRemove = useCallback(
    (indexToRemove: number) => {
      onFormDataChange({
        timeAtRiskConfigs: [
          ...formData.timeAtRiskConfigs.slice(0, indexToRemove),
          ...formData.timeAtRiskConfigs.slice(indexToRemove + 1),
        ],
      });
    },
    [formData]
  );

  const handleChange = useCallback(
    (
      indexToUpdate: number,
      riskWindowStart: number,
      riskWindowEnd: number,
      startAnchor: string,
      endAnchor: string
    ) => {
      onFormDataChange({
        timeAtRiskConfigs: [
          ...formData.timeAtRiskConfigs.slice(0, indexToUpdate),
          {
            ...formData.timeAtRiskConfigs[indexToUpdate],
            riskWindowStart,
            riskWindowEnd,
            startAnchor,
            endAnchor,
          },
          ...formData.timeAtRiskConfigs.slice(indexToUpdate + 1),
        ],
      });
    },
    [formData]
  );

  return (
    <NodeDrawer {...props} width="800px" onOk={handleOk} onClose={onClose}>
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
          label="DechallengeStopInterval"
          value={formData.dechallengeStopInterval}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({ dechallengeStopInterval: e.target.value })
          }
          type="number"
        />
      </Box>
      <Box mb={4}>
        <TextInput
          label="DechallengeEvaluationWindow"
          value={formData.dechallengeEvaluationWindow}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({ dechallengeEvaluationWindow: e.target.value })
          }
          type="number"
        />
      </Box>
      <Box mb={4}>
        <TextInput
          label="minPriorObservation"
          value={formData.minPriorObservation}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({ minPriorObservation: e.target.value })
          }
          type="number"
        />
      </Box>
      <Box mb={4}>
        <Autocomplete
          multiple
          sx={CONFIGS_USER_INPUT_ARRAY_STYLES}
          value={formData.targetIds}
          onChange={handleTargetIdsChange}
          options={[]}
          freeSolo
          renderInput={(params) => (
            <TextField
              {...params}
              label="TargetIds"
              placeholder="Enter Target ID"
            />
          )}
        />
      </Box>
      <Box mb={4}>
        <Autocomplete
          multiple
          sx={CONFIGS_USER_INPUT_ARRAY_STYLES}
          value={formData.outcomeIds}
          onChange={handleOutcomeIdsChange}
          options={[]}
          freeSolo
          renderInput={(params) => (
            <TextField
              {...params}
              label="OutcomeIds"
              placeholder="Enter Outcome ID"
            />
          )}
        />
      </Box>
      <Box mb={4}>
        <Box fontWeight="bold" mb={1}>
          Time At Risk Dataframe Configs
        </Box>
        {formData.timeAtRiskConfigs.length !== 0 &&
          formData.timeAtRiskConfigs.map((data, index) => (
            <TimeAtRiskConfigsForm
              key={index}
              index={index}
              configs={data}
              onRemove={() => handleRemove(index)}
              onChange={(
                riskWindowStart: number,
                riskWindowEnd: number,
                startAnchor: string,
                endAnchor: string
              ) =>
                handleChange(
                  index,
                  riskWindowStart,
                  riskWindowEnd,
                  startAnchor,
                  endAnchor
                )
              }
            />
          ))}
        <Box mt={2}>
          <IconButton
            startIcon={<AddSquareIcon />}
            title="Add timeAtRisk configuration"
            onClick={() =>
              setFormData((prevFormData) => ({
                ...prevFormData,
                timeAtRiskConfigs: [
                  ...prevFormData.timeAtRiskConfigs,
                  EMPTY_TIMEATRISK_FORM_DATA,
                ],
              }))
            }
          />
        </Box>
      </Box>
    </NodeDrawer>
  );
};
