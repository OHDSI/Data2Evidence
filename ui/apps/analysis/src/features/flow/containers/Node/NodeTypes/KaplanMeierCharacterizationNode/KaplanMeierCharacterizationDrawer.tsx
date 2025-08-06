import {
  Box,
  Checkbox,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextInput,
} from "@portal/components";
import React, { ChangeEvent, FC, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import { NodeProps } from "reactflow";
import { useFormData } from "~/features/flow/hooks";
import {
  markStatusAsDraft,
  selectNodeById,
  setNode,
} from "~/features/flow/reducers";
import { NodeState } from "~/features/flow/types";
import { RootState, dispatch } from "~/store";
import { NodeChoiceMap } from "..";
import { NodeDrawer, NodeDrawerProps } from "../../NodeDrawer/NodeDrawer";
import { KaplanMeierCharacterizationNodeData } from "./KaplanMeierCharacterizationNode";
import {
  ANALYSIS_TYPE_OPTIONS,
  EMPTY_KAPLAN_MEIER_CHARACTERIZATION_ARGS,
  KaplanMeierCharacterizationArgs,
} from "./types";

export interface KaplanMeierCharacterizationDrawerProps
  extends Omit<NodeDrawerProps, "children"> {
  node: NodeProps<KaplanMeierCharacterizationNodeData>;
  onClose: () => void;
}

interface FormData {
  name: string;
  description: string;
  kaplanMeierCharacterizationArgs: KaplanMeierCharacterizationArgs;
}

const EMPTY_FORM_DATA: FormData = {
  name: "",
  description: "OHDSI Kaplan-Meier survival characterization analysis",
  kaplanMeierCharacterizationArgs: EMPTY_KAPLAN_MEIER_CHARACTERIZATION_ARGS,
};

export const KaplanMeierCharacterizationDrawer: FC<
  KaplanMeierCharacterizationDrawerProps
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
        kaplanMeierCharacterizationArgs:
          node.data.kaplanMeierCharacterizationArgs ||
          EMPTY_KAPLAN_MEIER_CHARACTERIZATION_ARGS,
      });
    } else {
      setFormData({
        ...EMPTY_FORM_DATA,
        ...NodeChoiceMap["kaplan_meier_characterization_node"].defaultData,
      });
    }
  }, [node.data, setFormData]);

  const handleOk = useCallback(() => {
    const updated: NodeState<KaplanMeierCharacterizationNodeData> = {
      ...nodeState,
      data: formData,
    };
    dispatch(setNode(updated));
    dispatch(markStatusAsDraft());

    typeof onClose === "function" && onClose();
  }, [formData, nodeState, onClose]);

  const { kaplanMeierCharacterizationArgs } = formData;

  return (
    <NodeDrawer {...props} width="700px" onOk={handleOk} onClose={onClose}>
      <Box mb={4}>
        <TextInput
          label="Node Name"
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

      {/* Analysis Type Configuration */}
      <Box mb={4} border={"0.5px solid grey"} padding={"20px"}>
        <div style={{ paddingBottom: "20px" }}>Analysis Type</div>

        <Box mb={4}>
          <FormControl variant="standard" fullWidth>
            <InputLabel shrink>Analysis Type</InputLabel>
            <Select
              value={kaplanMeierCharacterizationArgs.analysisType}
              onChange={(e: SelectChangeEvent) =>
                onFormDataChange({
                  kaplanMeierCharacterizationArgs: {
                    ...kaplanMeierCharacterizationArgs,
                    analysisType: e.target.value as
                      | "single_event"
                      | "competing_risk",
                  },
                })
              }
            >
              {ANALYSIS_TYPE_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Cohort Configuration */}
      <Box mb={4} border={"0.5px solid grey"} padding={"20px"}>
        <div style={{ paddingBottom: "20px" }}>Cohort Configuration</div>

        <Box mb={4}>
          <TextInput
            label="Target Cohort ID"
            type="number"
            value={kaplanMeierCharacterizationArgs.targetCohortId || ""}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onFormDataChange({
                kaplanMeierCharacterizationArgs: {
                  ...kaplanMeierCharacterizationArgs,
                  targetCohortId: parseInt(e.target.value) || undefined,
                },
              })
            }
          />
        </Box>

        <Box mb={4}>
          <TextInput
            label="Outcome Cohort ID"
            type="number"
            value={kaplanMeierCharacterizationArgs.outcomeCohortId || ""}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onFormDataChange({
                kaplanMeierCharacterizationArgs: {
                  ...kaplanMeierCharacterizationArgs,
                  outcomeCohortId: parseInt(e.target.value) || undefined,
                },
              })
            }
          />
        </Box>

        {kaplanMeierCharacterizationArgs.analysisType === "competing_risk" && (
          <Box mb={4}>
            <TextInput
              label="Competing Outcome Cohort ID"
              type="number"
              value={
                kaplanMeierCharacterizationArgs.competingOutcomeCohortId || ""
              }
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onFormDataChange({
                  kaplanMeierCharacterizationArgs: {
                    ...kaplanMeierCharacterizationArgs,
                    competingOutcomeCohortId:
                      parseInt(e.target.value) || undefined,
                  },
                })
              }
            />
          </Box>
        )}

        {kaplanMeierCharacterizationArgs.analysisType === "single_event" && (
          <>
            <Box mb={4}>
              <Checkbox
                checked={kaplanMeierCharacterizationArgs.useStratification}
                label="Use Stratification"
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  onFormDataChange({
                    kaplanMeierCharacterizationArgs: {
                      ...kaplanMeierCharacterizationArgs,
                      useStratification: e.target.checked,
                    },
                  })
                }
              />
            </Box>

            {kaplanMeierCharacterizationArgs.useStratification && (
              <Box mb={4}>
                <TextInput
                  label="Stratification Cohort ID"
                  type="number"
                  value={
                    kaplanMeierCharacterizationArgs.stratificationCohortId || ""
                  }
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    onFormDataChange({
                      kaplanMeierCharacterizationArgs: {
                        ...kaplanMeierCharacterizationArgs,
                        stratificationCohortId:
                          parseInt(e.target.value) || undefined,
                      },
                    })
                  }
                />
              </Box>
            )}
          </>
        )}
      </Box>
    </NodeDrawer>
  );
};
