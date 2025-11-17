import React, { ChangeEvent, FC, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import { NodeProps } from "reactflow";
import {
  Box,
  TextInput,
  FormControl,
  Select,
  SelectChangeEvent,
  InputLabel,
  MenuItem,
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
import { NodeChoiceMap } from "..";
import { StudyPopulationSettingsNodeData } from "./StudyPopulationSettingsNode";

export interface StudyPopulationSettingsDrawerProps
  extends Omit<NodeDrawerProps, "children"> {
  node: NodeProps<StudyPopulationSettingsNodeData>;
  onClose: () => void;
}

interface FormData extends StudyPopulationSettingsNodeData {}

const EMPTY_FORM_DATA: FormData = {
  name: "",
  description: "",
  cohortMethodArgs: {
    minDaysAtRisk: 1,
    riskWindowStart: 0,
    startAnchor: "cohort start",
    riskWindowEnd: 30,
    endAnchor: "cohort end",
  },
  sccsArgs: {
    minAge: 18,
    naivePeriod: 365,
  },
  patientLevelPredictionArgs: {
    startAnchor: "cohort start",
    endAnchor: "cohort end",
    riskWindowStart: 1,
    riskWindowEnd: 365,
    minTimeAtRisk: 1,
  },
};

const START_END_ANCHOR_OPTIONS = ["cohort start", "cohort end"];

export const StudyPopulationSettingsDrawer: FC<
  StudyPopulationSettingsDrawerProps
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
        cohortMethodArgs: node.data.cohortMethodArgs,
        sccsArgs: node.data.sccsArgs,
        patientLevelPredictionArgs: node.data.patientLevelPredictionArgs,
      });
    } else {
      setFormData({
        ...EMPTY_FORM_DATA,
        ...NodeChoiceMap["study_population_settings_node"].defaultData,
      });
    }
  }, [node.data]);

  const handleOk = useCallback(() => {
    const updated: NodeState<StudyPopulationSettingsNodeData> = {
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
      <Box mb={4} border={"0.5px solid grey"} padding={"20px"}>
        <div style={{ paddingBottom: "20px" }}>CohortMethodArgs</div>
        <Box mb={4}>
          <TextInput
            label="Min Days At Risk"
            value={formData.cohortMethodArgs.minDaysAtRisk}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onFormDataChange({
                cohortMethodArgs: {
                  ...formData.cohortMethodArgs,
                  minDaysAtRisk: e.target.value,
                },
              })
            }
            type="number"
          />
        </Box>
        <Box mb={4}>
          <TextInput
            label="Risk Window Start"
            value={formData.cohortMethodArgs.riskWindowStart}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onFormDataChange({
                cohortMethodArgs: {
                  ...formData.cohortMethodArgs,
                  riskWindowStart: e.target.value,
                },
              })
            }
            type="number"
          />
        </Box>
        <Box mb={4}>
          <TextInput
            label="Risk Window End"
            value={formData.cohortMethodArgs.riskWindowEnd}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onFormDataChange({
                cohortMethodArgs: {
                  ...formData.cohortMethodArgs,
                  riskWindowEnd: e.target.value,
                },
              })
            }
            type="number"
          />
        </Box>
        <Box mb={4}>
          <FormControl variant="standard" fullWidth>
            <InputLabel shrink>Start Anchor</InputLabel>
            <Select
              value={formData.cohortMethodArgs.startAnchor}
              onChange={(e: SelectChangeEvent) =>
                onFormDataChange({
                  cohortMethodArgs: {
                    ...formData.cohortMethodArgs,
                    startAnchor: e.target.value,
                  },
                })
              }
            >
              <MenuItem value="">&nbsp;</MenuItem>
              {START_END_ANCHOR_OPTIONS.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Box mb={4}>
          <FormControl variant="standard" fullWidth>
            <InputLabel shrink>End Anchor</InputLabel>
            <Select
              value={formData.cohortMethodArgs.endAnchor}
              onChange={(e: SelectChangeEvent) =>
                onFormDataChange({
                  cohortMethodArgs: {
                    ...formData.cohortMethodArgs,
                    endAnchor: e.target.value,
                  },
                })
              }
            >
              <MenuItem value="">&nbsp;</MenuItem>
              {START_END_ANCHOR_OPTIONS.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>
      <Box mb={4} border={"0.5px solid grey"} padding={"20px"}>
        <div style={{ paddingBottom: "20px" }}>SCCSArgs</div>
        <Box mb={4}>
          <TextInput
            label="Min Age"
            value={formData.sccsArgs.minAge}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onFormDataChange({
                sccsArgs: {
                  ...formData.sccsArgs,
                  minAge: e.target.value,
                },
              })
            }
            type="number"
          />
        </Box>
        <Box mb={4}>
          <TextInput
            label="Naive Period"
            value={formData.sccsArgs.naivePeriod}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onFormDataChange({
                sccsArgs: {
                  ...formData.sccsArgs,
                  naivePeriod: e.target.value,
                },
              })
            }
            type="number"
          />
        </Box>
      </Box>
      <Box mb={4} border={"0.5px solid grey"} padding={"20px"}>
        <div style={{ paddingBottom: "20px" }}>PatientLevelPredictionArgs</div>
        <Box mb={4}>
          <TextInput
            label="Min Time At Risk"
            value={formData.patientLevelPredictionArgs.minTimeAtRisk}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onFormDataChange({
                patientLevelPredictionArgs: {
                  ...formData.patientLevelPredictionArgs,
                  minTimeAtRisk: e.target.value,
                },
              })
            }
            type="number"
          />
        </Box>
        <Box mb={4}>
          <TextInput
            label="Risk Window Start"
            value={formData.patientLevelPredictionArgs.riskWindowStart}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onFormDataChange({
                patientLevelPredictionArgs: {
                  ...formData.patientLevelPredictionArgs,
                  riskWindowStart: e.target.value,
                },
              })
            }
            type="number"
          />
        </Box>
        <Box mb={4}>
          <TextInput
            label="Risk Window End"
            value={formData.patientLevelPredictionArgs.riskWindowEnd}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onFormDataChange({
                patientLevelPredictionArgs: {
                  ...formData.patientLevelPredictionArgs,
                  riskWindowEnd: e.target.value,
                },
              })
            }
            type="number"
          />
        </Box>
        <Box mb={4}>
          <FormControl variant="standard" fullWidth>
            <InputLabel shrink>Start Anchor</InputLabel>
            <Select
              value={formData.patientLevelPredictionArgs.startAnchor}
              onChange={(e: SelectChangeEvent) =>
                onFormDataChange({
                  patientLevelPredictionArgs: {
                    ...formData.patientLevelPredictionArgs,
                    startAnchor: e.target.value,
                  },
                })
              }
            >
              <MenuItem value="">&nbsp;</MenuItem>
              {START_END_ANCHOR_OPTIONS.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Box mb={4}>
          <FormControl variant="standard" fullWidth>
            <InputLabel shrink>End Anchor</InputLabel>
            <Select
              value={formData.patientLevelPredictionArgs.endAnchor}
              onChange={(e: SelectChangeEvent) =>
                onFormDataChange({
                  patientLevelPredictionArgs: {
                    ...formData.patientLevelPredictionArgs,
                    endAnchor: e.target.value,
                  },
                })
              }
            >
              <MenuItem value="">&nbsp;</MenuItem>
              {START_END_ANCHOR_OPTIONS.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>
    </NodeDrawer>
  );
};
