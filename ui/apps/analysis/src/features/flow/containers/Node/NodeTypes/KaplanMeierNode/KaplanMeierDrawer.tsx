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
import { KaplanMeierNodeData } from "./KaplanMeierNode";
import {
  ANCHOR_OPTIONS,
  DUPLICATE_SUBJECTS_OPTIONS,
  EMPTY_KAPLAN_MEIER_ARGS,
  KaplanMeierArgs,
} from "./types";

export interface KaplanMeierDrawerProps
  extends Omit<NodeDrawerProps, "children"> {
  node: NodeProps<KaplanMeierNodeData>;
  onClose: () => void;
}

interface FormData {
  name: string;
  description: string;
  kaplanMeierArgs: KaplanMeierArgs;
}

const EMPTY_FORM_DATA: FormData = {
  name: "",
  description: "OHDSI Kaplan-Meier survival analysis",
  kaplanMeierArgs: EMPTY_KAPLAN_MEIER_ARGS,
};

export const KaplanMeierDrawer: FC<KaplanMeierDrawerProps> = ({
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
        kaplanMeierArgs: node.data.kaplanMeierArgs,
      });
    } else {
      setFormData({
        ...EMPTY_FORM_DATA,
        ...NodeChoiceMap["kaplan_meier_node"].defaultData,
      });
    }
  }, [node.data]);

  const handleOk = useCallback(() => {
    const updated: NodeState<KaplanMeierNodeData> = {
      ...nodeState,
      data: formData,
    };
    dispatch(setNode(updated));
    dispatch(markStatusAsDraft());

    typeof onClose === "function" && onClose();
  }, [formData]);

  return (
    <NodeDrawer {...props} width="600px" onOk={handleOk} onClose={onClose}>
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

      {/* Study Population Settings */}
      <Box mb={4} border={"0.5px solid grey"} padding={"20px"}>
        <div style={{ paddingBottom: "20px" }}>Study Population Settings</div>

        <Box mb={4}>
          <TextInput
            label="Outcome ID"
            type="number"
            value={formData.kaplanMeierArgs.outcomeId}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onFormDataChange({
                kaplanMeierArgs: {
                  ...formData.kaplanMeierArgs,
                  outcomeId: parseInt(e.target.value) || 1,
                },
              })
            }
          />
        </Box>

        <Box mb={4}>
          <TextInput
            label="Washout Period (days)"
            type="number"
            value={formData.kaplanMeierArgs.washoutPeriod}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onFormDataChange({
                kaplanMeierArgs: {
                  ...formData.kaplanMeierArgs,
                  washoutPeriod: parseInt(e.target.value) || 0,
                },
              })
            }
          />
        </Box>

        <Box mb={4}>
          <FormControl variant="standard" fullWidth>
            <InputLabel shrink>Remove Duplicate Subjects</InputLabel>
            <Select
              value={formData.kaplanMeierArgs.removeDuplicateSubjects}
              onChange={(e: SelectChangeEvent) =>
                onFormDataChange({
                  kaplanMeierArgs: {
                    ...formData.kaplanMeierArgs,
                    removeDuplicateSubjects: e.target.value as
                      | "keep all"
                      | "keep first"
                      | "remove all",
                  },
                })
              }
            >
              {DUPLICATE_SUBJECTS_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box mb={4}>
          <TextInput
            label="Minimum Days at Risk"
            type="number"
            value={formData.kaplanMeierArgs.minDaysAtRisk}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onFormDataChange({
                kaplanMeierArgs: {
                  ...formData.kaplanMeierArgs,
                  minDaysAtRisk: parseInt(e.target.value) || 1,
                },
              })
            }
          />
        </Box>

        <Box mb={4}>
          <Checkbox
            checked={formData.kaplanMeierArgs.firstExposureOnly}
            label="First Exposure Only"
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onFormDataChange({
                kaplanMeierArgs: {
                  ...formData.kaplanMeierArgs,
                  firstExposureOnly: e.target.checked,
                },
              })
            }
          />
        </Box>

        <Box mb={4}>
          <Checkbox
            checked={formData.kaplanMeierArgs.restrictToCommonPeriod}
            label="Restrict to Common Period"
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onFormDataChange({
                kaplanMeierArgs: {
                  ...formData.kaplanMeierArgs,
                  restrictToCommonPeriod: e.target.checked,
                },
              })
            }
          />
        </Box>

        <Box mb={4}>
          <Checkbox
            checked={formData.kaplanMeierArgs.removeSubjectsWithPriorOutcome}
            label="Remove Subjects with Prior Outcome"
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onFormDataChange({
                kaplanMeierArgs: {
                  ...formData.kaplanMeierArgs,
                  removeSubjectsWithPriorOutcome: e.target.checked,
                },
              })
            }
          />
        </Box>
      </Box>

      {/* Risk Window Settings */}
      <Box mb={4} border={"0.5px solid grey"} padding={"20px"}>
        <div style={{ paddingBottom: "20px" }}>Risk Window Settings</div>

        <Box mb={4}>
          <TextInput
            label="Risk Window Start (days)"
            type="number"
            value={formData.kaplanMeierArgs.riskWindowStart}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onFormDataChange({
                kaplanMeierArgs: {
                  ...formData.kaplanMeierArgs,
                  riskWindowStart: parseInt(e.target.value) || 0,
                },
              })
            }
          />
        </Box>

        <Box mb={4}>
          <FormControl variant="standard" fullWidth>
            <InputLabel shrink>Start Anchor</InputLabel>
            <Select
              value={formData.kaplanMeierArgs.startAnchor}
              onChange={(e: SelectChangeEvent) =>
                onFormDataChange({
                  kaplanMeierArgs: {
                    ...formData.kaplanMeierArgs,
                    startAnchor: e.target.value as
                      | "cohort start"
                      | "cohort end",
                  },
                })
              }
            >
              {ANCHOR_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box mb={4}>
          <TextInput
            label="Risk Window End (days)"
            type="number"
            value={formData.kaplanMeierArgs.riskWindowEnd}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onFormDataChange({
                kaplanMeierArgs: {
                  ...formData.kaplanMeierArgs,
                  riskWindowEnd: parseInt(e.target.value) || 30,
                },
              })
            }
          />
        </Box>

        <Box mb={4}>
          <FormControl variant="standard" fullWidth>
            <InputLabel shrink>End Anchor</InputLabel>
            <Select
              value={formData.kaplanMeierArgs.endAnchor}
              onChange={(e: SelectChangeEvent) =>
                onFormDataChange({
                  kaplanMeierArgs: {
                    ...formData.kaplanMeierArgs,
                    endAnchor: e.target.value as "cohort start" | "cohort end",
                  },
                })
              }
            >
              {ANCHOR_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Plot Settings */}
      <Box mb={4} border={"0.5px solid grey"} padding={"20px"}>
        <div style={{ paddingBottom: "20px" }}>Kaplan-Meier Plot Settings</div>

        <Box mb={4}>
          <Checkbox
            checked={formData.kaplanMeierArgs.includeZero}
            label="Include Zero Time Point"
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onFormDataChange({
                kaplanMeierArgs: {
                  ...formData.kaplanMeierArgs,
                  includeZero: e.target.checked,
                },
              })
            }
          />
        </Box>

        <Box mb={4}>
          <Checkbox
            checked={formData.kaplanMeierArgs.stratified}
            label="Stratified Analysis"
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onFormDataChange({
                kaplanMeierArgs: {
                  ...formData.kaplanMeierArgs,
                  stratified: e.target.checked,
                },
              })
            }
          />
        </Box>
      </Box>

      {/* Advanced Settings */}
      <Box mb={4} border={"0.5px solid grey"} padding={"20px"}>
        <div style={{ paddingBottom: "20px" }}>Advanced Settings</div>

        <Box mb={4}>
          <TextInput
            label="Minimum Days to Outcome"
            type="number"
            value={formData.kaplanMeierArgs.minDaysToOutcome || 0}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onFormDataChange({
                kaplanMeierArgs: {
                  ...formData.kaplanMeierArgs,
                  minDaysToOutcome: parseInt(e.target.value) || 0,
                },
              })
            }
          />
        </Box>

        <Box mb={4}>
          <Checkbox
            checked={formData.kaplanMeierArgs.censorAtNewRiskWindow || false}
            label="Censor at New Risk Window"
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onFormDataChange({
                kaplanMeierArgs: {
                  ...formData.kaplanMeierArgs,
                  censorAtNewRiskWindow: e.target.checked,
                },
              })
            }
          />
        </Box>
      </Box>
    </NodeDrawer>
  );
};
