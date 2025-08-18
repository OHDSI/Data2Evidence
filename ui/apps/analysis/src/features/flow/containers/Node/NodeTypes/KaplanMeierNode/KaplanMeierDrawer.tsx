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

      {/* CM Analysis List */}
      <Box mb={4} border={"0.5px solid grey"} padding={"20px"}>
        <div style={{ paddingBottom: "20px" }}>CM Analysis List</div>

        {/* Analysis Configuration */}
        <Box mb={4}>
          <div style={{ fontWeight: "bold", marginBottom: "15px" }}>
            Analysis Configuration
          </div>
          <Box mb={4}>
            <TextInput
              label="Analysis ID"
              type="number"
              value={formData.kaplanMeierArgs.analysisId}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onFormDataChange({
                  kaplanMeierArgs: {
                    ...formData.kaplanMeierArgs,
                    analysisId: parseInt(e.target.value) || 1,
                  },
                })
              }
            />
          </Box>
          <Box mb={4}>
            <TextInput
              label="Description"
              value={formData.kaplanMeierArgs.description}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onFormDataChange({
                  kaplanMeierArgs: {
                    ...formData.kaplanMeierArgs,
                    description: e.target.value,
                  },
                })
              }
            />
          </Box>
        </Box>

        {/* Get DB Cohort Method Data Args */}
        <Box mb={4}>
          <div style={{ fontWeight: "bold", marginBottom: "15px" }}>
            Get DB Cohort Method Data Args
          </div>
          <Box mb={4}>
            <TextInput
              label="Study Start Date"
              value={
                formData.kaplanMeierArgs.getDbCohortMethodDataArgs
                  .studyStartDate || ""
              }
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onFormDataChange({
                  kaplanMeierArgs: {
                    ...formData.kaplanMeierArgs,
                    getDbCohortMethodDataArgs: {
                      ...formData.kaplanMeierArgs.getDbCohortMethodDataArgs,
                      studyStartDate: e.target.value || undefined,
                    },
                  },
                })
              }
            />
          </Box>
          <Box mb={4}>
            <TextInput
              label="Study End Date"
              value={
                formData.kaplanMeierArgs.getDbCohortMethodDataArgs
                  .studyEndDate || ""
              }
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onFormDataChange({
                  kaplanMeierArgs: {
                    ...formData.kaplanMeierArgs,
                    getDbCohortMethodDataArgs: {
                      ...formData.kaplanMeierArgs.getDbCohortMethodDataArgs,
                      studyEndDate: e.target.value || undefined,
                    },
                  },
                })
              }
            />
          </Box>
        </Box>

        {/* Create Study Population Args */}
        <Box mb={4}>
          <div style={{ fontWeight: "bold", marginBottom: "15px" }}>
            Create Study Population Args
          </div>
          <Box mb={4}>
            <Checkbox
              checked={
                formData.kaplanMeierArgs.createStudyPopArgs.firstExposureOnly
              }
              label="First Exposure Only"
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onFormDataChange({
                  kaplanMeierArgs: {
                    ...formData.kaplanMeierArgs,
                    createStudyPopArgs: {
                      ...formData.kaplanMeierArgs.createStudyPopArgs,
                      firstExposureOnly: e.target.checked,
                    },
                  },
                })
              }
            />
          </Box>
          <Box mb={4}>
            <FormControl variant="standard" fullWidth>
              <InputLabel shrink>Remove Duplicate Subjects</InputLabel>
              <Select
                value={
                  formData.kaplanMeierArgs.createStudyPopArgs
                    .removeDuplicateSubjects
                }
                onChange={(e: SelectChangeEvent) =>
                  onFormDataChange({
                    kaplanMeierArgs: {
                      ...formData.kaplanMeierArgs,
                      createStudyPopArgs: {
                        ...formData.kaplanMeierArgs.createStudyPopArgs,
                        removeDuplicateSubjects: e.target.value as
                          | "keep all"
                          | "keep first"
                          | "remove all",
                      },
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
            <Checkbox
              checked={
                formData.kaplanMeierArgs.createStudyPopArgs
                  .removeSubjectsWithPriorOutcome
              }
              label="Remove Subjects with Prior Outcome"
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onFormDataChange({
                  kaplanMeierArgs: {
                    ...formData.kaplanMeierArgs,
                    createStudyPopArgs: {
                      ...formData.kaplanMeierArgs.createStudyPopArgs,
                      removeSubjectsWithPriorOutcome: e.target.checked,
                    },
                  },
                })
              }
            />
          </Box>
          <Box mb={4}>
            <TextInput
              label="Prior Outcome Lookback (days)"
              type="number"
              value={
                formData.kaplanMeierArgs.createStudyPopArgs.priorOutcomeLookback
              }
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onFormDataChange({
                  kaplanMeierArgs: {
                    ...formData.kaplanMeierArgs,
                    createStudyPopArgs: {
                      ...formData.kaplanMeierArgs.createStudyPopArgs,
                      priorOutcomeLookback: parseInt(e.target.value) || 0,
                    },
                  },
                })
              }
            />
          </Box>
          <Box mb={4}>
            <Checkbox
              checked={
                formData.kaplanMeierArgs.createStudyPopArgs.requireTimeAtRisk
              }
              label="Require Time at Risk"
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onFormDataChange({
                  kaplanMeierArgs: {
                    ...formData.kaplanMeierArgs,
                    createStudyPopArgs: {
                      ...formData.kaplanMeierArgs.createStudyPopArgs,
                      requireTimeAtRisk: e.target.checked,
                    },
                  },
                })
              }
            />
          </Box>
          <Box mb={4}>
            <TextInput
              label="Risk Window Start (days)"
              type="number"
              value={
                formData.kaplanMeierArgs.createStudyPopArgs.riskWindowStart
              }
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onFormDataChange({
                  kaplanMeierArgs: {
                    ...formData.kaplanMeierArgs,
                    createStudyPopArgs: {
                      ...formData.kaplanMeierArgs.createStudyPopArgs,
                      riskWindowStart: parseInt(e.target.value) || 0,
                    },
                  },
                })
              }
            />
          </Box>
          <Box mb={4}>
            <FormControl variant="standard" fullWidth>
              <InputLabel shrink>Start Anchor</InputLabel>
              <Select
                value={formData.kaplanMeierArgs.createStudyPopArgs.startAnchor}
                onChange={(e: SelectChangeEvent) =>
                  onFormDataChange({
                    kaplanMeierArgs: {
                      ...formData.kaplanMeierArgs,
                      createStudyPopArgs: {
                        ...formData.kaplanMeierArgs.createStudyPopArgs,
                        startAnchor: e.target.value as
                          | "cohort start"
                          | "cohort end",
                      },
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
              value={formData.kaplanMeierArgs.createStudyPopArgs.riskWindowEnd}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onFormDataChange({
                  kaplanMeierArgs: {
                    ...formData.kaplanMeierArgs,
                    createStudyPopArgs: {
                      ...formData.kaplanMeierArgs.createStudyPopArgs,
                      riskWindowEnd: parseInt(e.target.value) || 0,
                    },
                  },
                })
              }
            />
          </Box>
          <Box mb={4}>
            <FormControl variant="standard" fullWidth>
              <InputLabel shrink>End Anchor</InputLabel>
              <Select
                value={formData.kaplanMeierArgs.createStudyPopArgs.endAnchor}
                onChange={(e: SelectChangeEvent) =>
                  onFormDataChange({
                    kaplanMeierArgs: {
                      ...formData.kaplanMeierArgs,
                      createStudyPopArgs: {
                        ...formData.kaplanMeierArgs.createStudyPopArgs,
                        endAnchor: e.target.value as
                          | "cohort start"
                          | "cohort end",
                      },
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
      </Box>

      {/* Time At Risk Settings */}
      <Box mb={4} border={"0.5px solid grey"} padding={"20px"}>
        <div style={{ paddingBottom: "20px" }}>Time At Risk Settings</div>

        <Box mb={4}>
          <TextInput
            label="Label"
            value={formData.kaplanMeierArgs.timeAtRisks[0]?.label || ""}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onFormDataChange({
                kaplanMeierArgs: {
                  ...formData.kaplanMeierArgs,
                  timeAtRisks: [
                    {
                      ...formData.kaplanMeierArgs.timeAtRisks[0],
                      label: e.target.value,
                    },
                  ],
                },
              })
            }
          />
        </Box>

        <Box mb={4}>
          <TextInput
            label="Risk Window Start (days)"
            type="number"
            value={
              formData.kaplanMeierArgs.timeAtRisks[0]?.riskWindowStart || 0
            }
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onFormDataChange({
                kaplanMeierArgs: {
                  ...formData.kaplanMeierArgs,
                  timeAtRisks: [
                    {
                      ...formData.kaplanMeierArgs.timeAtRisks[0],
                      riskWindowStart: parseInt(e.target.value) || 0,
                    },
                  ],
                },
              })
            }
          />
        </Box>

        <Box mb={4}>
          <FormControl variant="standard" fullWidth>
            <InputLabel shrink>Start Anchor</InputLabel>
            <Select
              value={
                formData.kaplanMeierArgs.timeAtRisks[0]?.startAnchor ||
                "cohort start"
              }
              onChange={(e: SelectChangeEvent) =>
                onFormDataChange({
                  kaplanMeierArgs: {
                    ...formData.kaplanMeierArgs,
                    timeAtRisks: [
                      {
                        ...formData.kaplanMeierArgs.timeAtRisks[0],
                        startAnchor: e.target.value as
                          | "cohort start"
                          | "cohort end",
                      },
                    ],
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
            value={formData.kaplanMeierArgs.timeAtRisks[0]?.riskWindowEnd || 0}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onFormDataChange({
                kaplanMeierArgs: {
                  ...formData.kaplanMeierArgs,
                  timeAtRisks: [
                    {
                      ...formData.kaplanMeierArgs.timeAtRisks[0],
                      riskWindowEnd: parseInt(e.target.value) || 0,
                    },
                  ],
                },
              })
            }
          />
        </Box>

        <Box mb={4}>
          <FormControl variant="standard" fullWidth>
            <InputLabel shrink>End Anchor</InputLabel>
            <Select
              value={
                formData.kaplanMeierArgs.timeAtRisks[0]?.endAnchor ||
                "cohort end"
              }
              onChange={(e: SelectChangeEvent) =>
                onFormDataChange({
                  kaplanMeierArgs: {
                    ...formData.kaplanMeierArgs,
                    timeAtRisks: [
                      {
                        ...formData.kaplanMeierArgs.timeAtRisks[0],
                        endAnchor: e.target.value as
                          | "cohort start"
                          | "cohort end",
                      },
                    ],
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
    </NodeDrawer>
  );
};
