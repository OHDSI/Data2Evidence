import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextInput,
  IconButton,
} from "@portal/components";
import ClearIcon from "@mui/icons-material/Clear";
import React, { ChangeEvent, FC, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import { NodeProps } from "reactflow";
import { useFormData } from "~/features/flow/hooks";
import { useGetWebApiCohortDefinitionsQuery } from "~/features/flow/slices";
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
import { Cohort } from "../CohortSelectionNode/CohortSelectionType";

export interface CompetingOutcomeCohortStratificationDrawerProps
  extends Omit<NodeDrawerProps, "children"> {
  node: NodeProps<CompetingOutcomeCohortStratificationNodeData>;
  onClose: () => void;
}

interface FormData {
  name: string;
  description: string;
  competingOutcomeCohortStratificationArgs: CompetingOutcomeCohortStratificationArgs;
  cohorts: { cohortId: number; cohortName: string }[];
}

const EMPTY_FORM_DATA: FormData = {
  name: "",
  description:
    "Competing Outcome Cohort / Stratification input for Kaplan-Meier analysis",
  competingOutcomeCohortStratificationArgs:
    EMPTY_COMPETING_OUTCOME_COHORT_STRATIFICATION_ARGS,
  cohorts: [],
};

export const CompetingOutcomeCohortStratificationDrawer: FC<
  CompetingOutcomeCohortStratificationDrawerProps
> = ({ node, onClose, ...props }) => {
  const { formData, setFormData, onFormDataChange } =
    useFormData<FormData>(EMPTY_FORM_DATA);
  const nodeState = useSelector((state: RootState) =>
    selectNodeById(state, node.id)
  );
  const { data: cohortDefinitions } = useGetWebApiCohortDefinitionsQuery(null, {
    selectFromResult: ({ data }) => ({
      data: data?.filter(
        (cohort) => !formData.cohorts.some((c) => c.cohortId === cohort.id)
      ),
    }),
  });

  useEffect(() => {
    if (node.data) {
      setFormData({
        name: node.data.name,
        description: node.data.description,
        competingOutcomeCohortStratificationArgs:
          node.data.competingOutcomeCohortStratificationArgs ||
          EMPTY_COMPETING_OUTCOME_COHORT_STRATIFICATION_ARGS,
        cohorts: [],
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

  const handleAddCohort = useCallback(
    (value: Cohort) => {
      onFormDataChange({
        cohorts: [
          ...formData.cohorts,
          { cohortId: value.cohortId, cohortName: value.cohortName },
        ],
      });
    },
    [onFormDataChange, formData.cohorts]
  );

  const handleSelectChange = useCallback(
    (event: SelectChangeEvent) => {
      const selectedCohortId = Number(event.target.value);
      const selectedCohort = cohortDefinitions?.find(
        (cohort) => cohort.id === selectedCohortId
      );

      if (selectedCohort) {
        handleAddCohort({
          cohortId: selectedCohort.id,
          cohortName: selectedCohort.name,
        });
      }
    },
    [cohortDefinitions, handleAddCohort]
  );

  const handleRemoveCohort = useCallback(
    (index: number) => {
      const updatedCohorts = formData.cohorts.filter((_, i) => i !== index);
      onFormDataChange({ cohorts: updatedCohorts });
    },
    [formData.cohorts, onFormDataChange]
  );

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

      <Box mb={4}>
        <InputLabel shrink>Cohort Selection</InputLabel>
        <Select fullWidth value="" onChange={handleSelectChange} displayEmpty>
          <MenuItem value="" disabled>
            Select a cohort to add...
          </MenuItem>
          {cohortDefinitions?.map((cohort) => (
            <MenuItem key={cohort.id} value={cohort.id}>
              <Box>
                <strong>Cohort Id:</strong> {cohort.id} <br />
                <strong>Cohort Name:</strong> {cohort.name} <br />
                <strong>Cohort Description:</strong> {cohort.description}
              </Box>
            </MenuItem>
          ))}
        </Select>

        {formData.cohorts.map((cohort, index) => (
          <Box
            key={index}
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            gap={1}
            marginTop={1}
            padding={1}
            border="1px solid #ddd"
            borderRadius={1}
          >
            <Box>
              <strong>Cohort Id:</strong> {cohort.cohortId} <br />
              <strong>Cohort Name:</strong> {cohort.cohortName} <br />
            </Box>
            <IconButton
              size="small"
              onClick={() => handleRemoveCohort(index)}
              startIcon={<ClearIcon />}
            ></IconButton>
          </Box>
        ))}
      </Box>
    </NodeDrawer>
  );
};
