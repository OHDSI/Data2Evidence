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
import { NodeChoiceMap } from "..";
import { CohortMethodAnalysisNodeData } from "./CohortMethodAnalysisNode";

export interface CohortMethodAnalysisDrawerProps
  extends Omit<NodeDrawerProps, "children"> {
  node: NodeProps<CohortMethodAnalysisNodeData>;
  onClose: () => void;
}

interface FormData extends CohortMethodAnalysisNodeData {}

const EMPTY_FORM_DATA: FormData = {
  name: "",
  description: "Matching on ps and covariates, simple outcomeModel",
  analysisId: undefined,
  dbCohortMethodDataArgs: {
    washoutPeriod: 183,
    firstExposureOnly: true,
    removeDuplicateSubjects: "remove all",
    maxCohortSize: 100000,
  },
  fitOutcomeModelArgs: {
    modelType: "cox",
  },
  psArgs: {
    stopOnError: false,
    control: false,
    cvRepetition: 1,
  },
};

export const CohortMethodAnalysisDrawer: FC<
  CohortMethodAnalysisDrawerProps
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
        dbCohortMethodDataArgs: node.data.dbCohortMethodDataArgs,
        fitOutcomeModelArgs: node.data.fitOutcomeModelArgs,
        psArgs: node.data.psArgs,
      });
    } else {
      setFormData({
        ...EMPTY_FORM_DATA,
        ...NodeChoiceMap["cohort_method_analysis_node"].defaultData,
      });
    }
  }, [node.data]);

  const handleOk = useCallback(() => {
    const updated: NodeState<CohortMethodAnalysisNodeData> = {
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
            onFormDataChange({
              analysisId: e.target.value,
            })
          }
          type="number"
        />
      </Box>
      <Box mb={4} border={"0.5px solid grey"} padding={"20px"}>
        <div style={{ paddingBottom: "20px" }}>DbCohortMethodDataArgs</div>
        <Box mb={4}>
          <TextInput
            label="Washout Period"
            value={formData.dbCohortMethodDataArgs.washoutPeriod}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onFormDataChange({
                dbCohortMethodDataArgs: {
                  ...formData.dbCohortMethodDataArgs,
                  washoutPeriod: e.target.value,
                },
              })
            }
            type="number"
          />
        </Box>
        <Box mb={4}>
          <Checkbox
            checked={formData.dbCohortMethodDataArgs.firstExposureOnly}
            label="First Exposure Only"
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onFormDataChange({
                dbCohortMethodDataArgs: {
                  ...formData.dbCohortMethodDataArgs,
                  firstExposureOnly: e.target.checked,
                },
              })
            }
          />
        </Box>
        <Box mb={4}>
          <TextInput
            label="Remove Duplicate Subjects"
            value={formData.dbCohortMethodDataArgs.removeDuplicateSubjects}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onFormDataChange({
                dbCohortMethodDataArgs: {
                  ...formData.dbCohortMethodDataArgs,
                  removeDuplicateSubjects: e.target.value,
                },
              })
            }
          />
        </Box>
        <Box mb={4}>
          <TextInput
            label="Max Cohort Size"
            value={formData.dbCohortMethodDataArgs.maxCohortSize}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onFormDataChange({
                dbCohortMethodDataArgs: {
                  ...formData.dbCohortMethodDataArgs,
                  maxCohortSize: e.target.value,
                },
              })
            }
            type="number"
          />
        </Box>
      </Box>
      <Box mb={4} border={"0.5px solid grey"} padding={"20px"}>
        <div style={{ paddingBottom: "20px" }}>FitOutcomeModelArgs</div>
        <Box mb={4}>
          <TextInput
            label="Model Type"
            value={formData.fitOutcomeModelArgs.modelType}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onFormDataChange({
                fitOutcomeModelArgs: {
                  ...formData.fitOutcomeModelArgs,
                  modelType: e.target.value,
                },
              })
            }
          />
        </Box>
      </Box>

      <Box mb={4} border={"0.5px solid grey"} padding={"20px"}>
        <div style={{ paddingBottom: "20px" }}>PsArgs</div>
        <Box mb={4}>
          <Checkbox
            checked={formData.psArgs.stopOnError}
            label="Stop On Error"
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onFormDataChange({
                psArgs: {
                  ...formData.psArgs,
                  stopOnError: e.target.checked,
                },
              })
            }
          />
        </Box>
        <Box mb={4}>
          <Checkbox
            checked={formData.psArgs.control}
            label="Control"
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onFormDataChange({
                psArgs: {
                  ...formData.psArgs,
                  control: e.target.checked,
                },
              })
            }
          />
        </Box>
        {formData.psArgs.control && (
          <Box mb={4}>
            <TextInput
              label="CV Repetition"
              value={formData.psArgs.cvRepetition}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onFormDataChange({
                  psArgs: {
                    ...formData.psArgs,
                    cvRepetition: e.target.value,
                  },
                })
              }
              type="number"
            />
          </Box>
        )}
      </Box>
    </NodeDrawer>
  );
};
