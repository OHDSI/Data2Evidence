import React, { ChangeEvent, FC, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import { NodeProps } from "reactflow";
import { Box, TextInput, Checkbox } from "@portal/components";
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
import { SelfControlledCaseSeriesAnalysisNodeData } from "./SelfControlledCaseSeriesAnalysisNode";

export interface SelfControlledCaseSeriesAnalysisDrawerProps
  extends Omit<NodeDrawerProps, "children"> {
  node: NodeProps<SelfControlledCaseSeriesAnalysisNodeData>;
  onClose: () => void;
}

interface FormData extends SelfControlledCaseSeriesAnalysisNodeData {}

const EMPTY_FORM_DATA: FormData = {
  name: "",
  description: "SCCS age 18-",
  analysisId: undefined,
  dbSccsDataArgs: {
    studyStartDate: "",
    studyEndDate: "",
    maxCasesPerOutcome: 100000,
    useNestingCohort: true,
    nestingCohortId: 1,
    deleteCovariateSmallCount: 0,
  },
  sccsIntervalDataArgs: {
    minCasesForTimeCovariates: 100000,
  },
  fitSccsModelArgs: {
    control: false,
    cvType: "auto",
    selectorType: "byPid",
    startingVariance: 0.1,
    seed: 1,
    resetCoefficients: true,
    noiseLevel: "quiet",
  },
};

export const SelfControlledCaseSeriesAnalysisDrawer: FC<
  SelfControlledCaseSeriesAnalysisDrawerProps
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
        analysisId: node.data.analysisId,
        dbSccsDataArgs: node.data.dbSccsDataArgs,
        sccsIntervalDataArgs: node.data.sccsIntervalDataArgs,
        fitSccsModelArgs: node.data.fitSccsModelArgs,
      });
    } else {
      setFormData({
        ...EMPTY_FORM_DATA,
        ...NodeChoiceMap["self_controlled_case_series_analysis_node"]
          .defaultData,
      });
    }
  }, [node.data]);

  const handleOk = useCallback(() => {
    const updated: NodeState<SelfControlledCaseSeriesAnalysisNodeData> = {
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
          label="Analysis ID"
          value={formData.analysisId}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({ analysisId: e.target.value })
          }
          type="number"
        />
      </Box>
      <Box mb={4} border={"0.5px solid grey"} padding={"20px"}>
        <div style={{ paddingBottom: "20px" }}>DbSccsDataArgs</div>
        <Box mb={4}>
          <TextInput
            label="Study Start Date"
            value={formData.dbSccsDataArgs.studyStartDate}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onFormDataChange({
                dbSccsDataArgs: {
                  ...formData.dbSccsDataArgs,
                  studyStartDate: e.target.value,
                },
              })
            }
          />
        </Box>
        <Box mb={4}>
          <TextInput
            label="Study End Date"
            value={formData.dbSccsDataArgs.studyEndDate}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onFormDataChange({
                dbSccsDataArgs: {
                  ...formData.dbSccsDataArgs,
                  studyEndDate: e.target.value,
                },
              })
            }
          />
        </Box>
        <Box mb={4}>
          <TextInput
            label="Max Cases Per Outcome"
            value={formData.dbSccsDataArgs.maxCasesPerOutcome}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onFormDataChange({
                dbSccsDataArgs: {
                  ...formData.dbSccsDataArgs,
                  maxCasesPerOutcome: e.target.value,
                },
              })
            }
            type="number"
          />
        </Box>
        <Box mb={4}>
          <Checkbox
            checked={formData.dbSccsDataArgs.useNestingCohort}
            label="Use Nesting Cohort"
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onFormDataChange({
                dbSccsDataArgs: {
                  ...formData.dbSccsDataArgs,
                  useNestingCohort: e.target.checked,
                },
              })
            }
          />
        </Box>
        <Box mb={4}>
          <TextInput
            label="Nesting Cohort ID"
            value={formData.dbSccsDataArgs.nestingCohortId}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onFormDataChange({
                dbSccsDataArgs: {
                  ...formData.dbSccsDataArgs,
                  nestingCohortId: e.target.value,
                },
              })
            }
            type="number"
          />
        </Box>
        <Box mb={4}>
          <TextInput
            label="Delete Covariate Small Count"
            value={formData.dbSccsDataArgs.deleteCovariateSmallCount}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onFormDataChange({
                dbSccsDataArgs: {
                  ...formData.dbSccsDataArgs,
                  deleteCovariateSmallCount: e.target.value,
                },
              })
            }
            type="number"
          />
        </Box>
      </Box>
      <Box mb={4} border={"0.5px solid grey"} padding={"20px"}>
        <div style={{ paddingBottom: "20px" }}>SccsIntervalDataArgs</div>
        <Box mb={4}>
          <TextInput
            label="Min Cases For Time Covariates"
            value={formData.sccsIntervalDataArgs.minCasesForTimeCovariates}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onFormDataChange({
                sccsIntervalDataArgs: {
                  ...formData.sccsIntervalDataArgs,
                  minCasesForTimeCovariates: e.target.value,
                },
              })
            }
            type="number"
          />
        </Box>
      </Box>
      <Box mb={4} border={"0.5px solid grey"} padding={"20px"}>
        <div style={{ paddingBottom: "20px" }}>FitSccsModelArgs</div>
        <Box mb={4}>
          <Checkbox
            checked={formData.fitSccsModelArgs.control}
            label="Control"
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onFormDataChange({
                fitSccsModelArgs: {
                  ...formData.fitSccsModelArgs,
                  control: e.target.checked,
                },
              })
            }
          />
        </Box>

        {formData.fitSccsModelArgs.control && (
          <>
            <Box mb={4}>
              <TextInput
                label="CV Type"
                value={formData.fitSccsModelArgs.cvType}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  onFormDataChange({
                    fitSccsModelArgs: {
                      ...formData.fitSccsModelArgs,
                      cvType: e.target.value,
                    },
                  })
                }
              />
            </Box>
            <Box mb={4}>
              <TextInput
                label="Selector Type"
                value={formData.fitSccsModelArgs.selectorType}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  onFormDataChange({
                    fitSccsModelArgs: {
                      ...formData.fitSccsModelArgs,
                      selectorType: e.target.value,
                    },
                  })
                }
              />
            </Box>
            <Box mb={4}>
              <TextInput
                label="Starting Variance"
                value={formData.fitSccsModelArgs.startingVariance}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  onFormDataChange({
                    fitSccsModelArgs: {
                      ...formData.fitSccsModelArgs,
                      startingVariance: e.target.value,
                    },
                  })
                }
                type="number"
              />
            </Box>
            <Box mb={4}>
              <TextInput
                label="Seed"
                value={formData.fitSccsModelArgs.seed}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  onFormDataChange({
                    fitSccsModelArgs: {
                      ...formData.fitSccsModelArgs,
                      seed: e.target.value,
                    },
                  })
                }
                type="number"
              />
            </Box>
            <Box mb={4}>
              <Checkbox
                checked={formData.fitSccsModelArgs.resetCoefficients}
                label="Reset Coefficients"
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  onFormDataChange({
                    fitSccsModelArgs: {
                      ...formData.fitSccsModelArgs,
                      resetCoefficients: e.target.checked,
                    },
                  })
                }
              />
            </Box>
            <Box mb={4}>
              <TextInput
                label="Noise Level"
                value={formData.fitSccsModelArgs.noiseLevel}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  onFormDataChange({
                    fitSccsModelArgs: {
                      ...formData.fitSccsModelArgs,
                      noiseLevel: e.target.value,
                    },
                  })
                }
              />
            </Box>
          </>
        )}
      </Box>
    </NodeDrawer>
  );
};
