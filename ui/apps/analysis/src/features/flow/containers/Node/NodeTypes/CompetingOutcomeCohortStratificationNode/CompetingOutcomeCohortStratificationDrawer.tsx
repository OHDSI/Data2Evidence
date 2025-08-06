import {
  Box,
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
import { CompetingOutcomeCohortStratificationNodeData } from "./CompetingOutcomeCohortStratificationNode";
import {
  COHORT_TYPE_OPTIONS,
  CompetingOutcomeCohortStratificationArgs,
  EMPTY_COMPETING_OUTCOME_COHORT_STRATIFICATION_ARGS,
} from "./types";

export interface CompetingOutcomeCohortStratificationDrawerProps
  extends Omit<NodeDrawerProps, "children"> {
  node: NodeProps<CompetingOutcomeCohortStratificationNodeData>;
  onClose: () => void;
}

interface FormData {
  name: string;
  description: string;
  competingOutcomeCohortStratificationArgs: CompetingOutcomeCohortStratificationArgs;
}

const EMPTY_FORM_DATA: FormData = {
  name: "",
  description:
    "Competing Outcome Cohort / Stratification input for Kaplan-Meier analysis",
  competingOutcomeCohortStratificationArgs:
    EMPTY_COMPETING_OUTCOME_COHORT_STRATIFICATION_ARGS,
};

export const CompetingOutcomeCohortStratificationDrawer: FC<
  CompetingOutcomeCohortStratificationDrawerProps
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
        competingOutcomeCohortStratificationArgs:
          node.data.competingOutcomeCohortStratificationArgs ||
          EMPTY_COMPETING_OUTCOME_COHORT_STRATIFICATION_ARGS,
      });
    } else {
      setFormData({
        ...EMPTY_FORM_DATA,
        ...NodeChoiceMap["competing_outcome_cohort_stratification_node"]
          .defaultData,
      });
    }
  }, [node.data, setFormData]);

  const handleOk = useCallback(() => {
    const updated: NodeState<CompetingOutcomeCohortStratificationNodeData> = {
      ...nodeState,
      data: formData,
    };
    dispatch(setNode(updated));
    dispatch(markStatusAsDraft());

    typeof onClose === "function" && onClose();
  }, [formData, nodeState, onClose]);

  const { competingOutcomeCohortStratificationArgs } = formData;

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

      {/* Cohort Type Configuration */}
      <Box mb={4} border={"0.5px solid grey"} padding={"20px"}>
        <div style={{ paddingBottom: "20px" }}>Cohort Type</div>

        <Box mb={4}>
          <FormControl variant="standard" fullWidth>
            <InputLabel shrink>Cohort Type</InputLabel>
            <Select
              value={competingOutcomeCohortStratificationArgs.cohortType}
              onChange={(e: SelectChangeEvent) =>
                onFormDataChange({
                  competingOutcomeCohortStratificationArgs: {
                    ...competingOutcomeCohortStratificationArgs,
                    cohortType: e.target.value as
                      | "competing_outcome"
                      | "stratification",
                  },
                })
              }
            >
              {COHORT_TYPE_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Basic Cohort Configuration */}
      <Box mb={4} border={"0.5px solid grey"} padding={"20px"}>
        <div style={{ paddingBottom: "20px" }}>Cohort Configuration</div>

        <Box mb={4}>
          <TextInput
            label="Cohort ID"
            type="number"
            value={competingOutcomeCohortStratificationArgs.cohortId || ""}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onFormDataChange({
                competingOutcomeCohortStratificationArgs: {
                  ...competingOutcomeCohortStratificationArgs,
                  cohortId: parseInt(e.target.value) || undefined,
                },
              })
            }
          />
        </Box>

        <Box mb={4}>
          <TextInput
            label="Cohort Name"
            value={competingOutcomeCohortStratificationArgs.cohortName || ""}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onFormDataChange({
                competingOutcomeCohortStratificationArgs: {
                  ...competingOutcomeCohortStratificationArgs,
                  cohortName: e.target.value,
                },
              })
            }
          />
        </Box>

        <Box mb={4}>
          <TextInput
            label="Cohort Description"
            value={
              competingOutcomeCohortStratificationArgs.cohortDescription || ""
            }
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onFormDataChange({
                competingOutcomeCohortStratificationArgs: {
                  ...competingOutcomeCohortStratificationArgs,
                  cohortDescription: e.target.value,
                },
              })
            }
          />
        </Box>
      </Box>

      {/* Stratification Specific Settings */}
      {competingOutcomeCohortStratificationArgs.cohortType ===
        "stratification" && (
        <Box mb={4} border={"0.5px solid grey"} padding={"20px"}>
          <div style={{ paddingBottom: "20px" }}>Stratification Settings</div>

          <Box mb={4}>
            <TextInput
              label="Stratification Variable"
              value={
                competingOutcomeCohortStratificationArgs.stratificationVariable ||
                ""
              }
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onFormDataChange({
                  competingOutcomeCohortStratificationArgs: {
                    ...competingOutcomeCohortStratificationArgs,
                    stratificationVariable: e.target.value,
                  },
                })
              }
            />
          </Box>

          <Box mb={4}>
            <TextInput
              label="Stratification Levels (comma-separated)"
              value={
                competingOutcomeCohortStratificationArgs.stratificationLevels?.join(
                  ", "
                ) || ""
              }
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onFormDataChange({
                  competingOutcomeCohortStratificationArgs: {
                    ...competingOutcomeCohortStratificationArgs,
                    stratificationLevels: e.target.value
                      .split(",")
                      .map((level) => level.trim())
                      .filter(Boolean),
                  },
                })
              }
            />
          </Box>
        </Box>
      )}
    </NodeDrawer>
  );
};
