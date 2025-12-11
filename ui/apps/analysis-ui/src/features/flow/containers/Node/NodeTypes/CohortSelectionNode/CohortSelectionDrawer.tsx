import React, { FC, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import { NodeProps } from "reactflow";
import {
  Box,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
} from "@portal/components";
import ClearIcon from "@mui/icons-material/Clear";
import { NodeDrawer, NodeDrawerProps } from "../../NodeDrawer/NodeDrawer";
import { NodeChoiceMap } from "..";
import { useFormData } from "~/features/flow/hooks";
import { useGetWebApiCohortDefinitionsQuery } from "~/features/flow/slices";
import {
  markStatusAsDraft,
  selectNodeById,
  setNode,
} from "~/features/flow/reducers";
import { NodeState } from "~/features/flow/types";
import { RootState, dispatch } from "~/store";
import { CohortSelectionNodeData } from "./CohortSelectionNode";
import { Cohort } from "./CohortSelectionType";
export interface CohortSelectionDrawerProps
  extends Omit<NodeDrawerProps, "children"> {
  node: NodeProps<CohortSelectionNodeData>;
  onClose: () => void;
}

interface FormData extends CohortSelectionNodeData {}

const EMPTY_FORM_DATA: FormData = {
  name: "",
  cohorts: [],
};

export const CohortSelectionDrawer: FC<CohortSelectionDrawerProps> = ({
  node,
  onClose,
  ...props
}) => {
  const { formData, setFormData, onFormDataChange } =
    useFormData<FormData>(EMPTY_FORM_DATA);

  const { data: cohortDefinitions } = useGetWebApiCohortDefinitionsQuery(null, {
    selectFromResult: ({ data }) => ({
      data: data?.filter(
        (cohort) => !formData.cohorts.some((c) => c.cohortId === cohort.id)
      ),
    }),
  });

  const nodeState = useSelector((state: RootState) =>
    selectNodeById(state, node.id)
  );

  useEffect(() => {
    if (node.data) {
      setFormData({
        name: node.data.name,
        cohorts: node.data.cohorts,
      });
    } else {
      setFormData({
        ...EMPTY_FORM_DATA,
        ...NodeChoiceMap["cohort_selection_node"].defaultData,
      });
    }
  }, [node.data]);

  const handleOk = useCallback(() => {
    const updated: NodeState<CohortSelectionNodeData> = {
      ...nodeState,
      data: formData,
    };
    dispatch(setNode(updated));
    dispatch(markStatusAsDraft());

    typeof onClose === "function" && onClose();
  }, [formData]);

  const handleCancel = useCallback(() => {
    if (node.data) {
      setFormData({
        name: node.data.name,
        cohorts: node.data.cohorts,
      });
    } else {
      setFormData({
        ...EMPTY_FORM_DATA,
        ...NodeChoiceMap["cohort_selection_node"].defaultData,
      });
    }
    typeof onClose === "function" && onClose();
  }, [node.data]);

  const handleAddCohort = useCallback(
    (value: Cohort) => {
      onFormDataChange({
        cohorts: [
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

  return (
    <NodeDrawer {...props} width="500px" onOk={handleOk} onClose={handleCancel}>
      <Box mb={4}>
        <InputLabel shrink>Cohort Selection</InputLabel>
        <Select
          fullWidth
          value=""
          onChange={handleSelectChange}
          displayEmpty
          disabled={formData.cohorts.length >= 1}
        >
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
            padding={2}
            fontSize={14}
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
