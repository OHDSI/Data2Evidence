import React, { ChangeEvent, FC, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import { NodeProps } from "reactflow";
import {
  Box,
  TextInput,
  InputLabel,
  MenuItem,
  FormControl,
  Select,
  SelectChangeEvent,
} from "@portal/components";
import { useFormData } from "~/features/flow/hooks";
import {
  markStatusAsDraft,
  selectNodeById,
  setNode,
} from "~/features/flow/reducers";
import { NodeState } from "~/features/flow/types";
import { RootState, dispatch } from "~/store";
import { TreatmentPatternsNodeData } from "./TreatmentPatternsNode";
import { NodeDrawer, NodeDrawerProps } from "../../NodeDrawer/NodeDrawer";
import { NodeChoiceMap } from "..";
import {
  IncludeTreatments,
  FilterTreatments,
  CensorType,
} from "./TreatmentPatternsType";

export interface TreatmentPatternsDrawerProps
  extends Omit<NodeDrawerProps, "children"> {
  node: NodeProps<TreatmentPatternsNodeData>;
  onClose: () => void;
}

interface FormData extends TreatmentPatternsNodeData {}
console.log(IncludeTreatments, FilterTreatments, CensorType);
const EMPTY_FORM_DATA: FormData = {
  name: "",
  cohorts: [],
  includeTreatments: IncludeTreatments.StartDate,
  indexDateOffset: 0,
  minEraDuration: 0,
  splitEventCohorts: "",
  splitTime: 30,
  eraCollapseSize: 30,
  combinationWindow: 30,
  minPostCombinationDuration: 30,
  filterTreatments: FilterTreatments.First,
  maxPathLength: 5,
  ageWindow: 10,
  minCellCount: 5,
  censorType: CensorType.MinCellCount,
};

export const TreatmentPatternsDrawer: FC<TreatmentPatternsDrawerProps> = ({
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
        cohorts: node.data.cohorts,
        includeTreatments: node.data.includeTreatments,
        indexDateOffset: node.data.indexDateOffset,
        minEraDuration: node.data.minEraDuration,
        splitEventCohorts: node.data.splitEventCohorts,
        splitTime: node.data.splitTime,
        eraCollapseSize: node.data.eraCollapseSize,
        combinationWindow: node.data.combinationWindow,
        minPostCombinationDuration: node.data.minPostCombinationDuration,
        filterTreatments: node.data.filterTreatments,
        maxPathLength: node.data.maxPathLength,
        ageWindow: node.data.ageWindow,
        minCellCount: node.data.minCellCount,
        censorType: node.data.censorType,
      });
    } else {
      setFormData({
        ...EMPTY_FORM_DATA,
        ...NodeChoiceMap["treatment_patterns_node"].defaultData,
      });
    }
  }, [node.data]);
  const handleOk = useCallback(() => {
    const updated: NodeState<TreatmentPatternsNodeData> = {
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
        <FormControl variant="standard" fullWidth>
          <InputLabel shrink>Include Treatments</InputLabel>
          <Select
            value={formData.includeTreatments}
            onChange={(e: SelectChangeEvent) =>
              onFormDataChange({
                includeTreatments: e.target.value,
              })
            }
          >
            {Object.values(IncludeTreatments).map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      <Box mb={4}>
        <TextInput
          label="indexDateOffset"
          value={formData.indexDateOffset}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({ indexDateOffset: e.target.value })
          }
          type="number"
        />
      </Box>
      <Box mb={4}>
        <TextInput
          label="minEraDuration"
          value={formData.minEraDuration}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({ minEraDuration: e.target.value })
          }
          type="number"
        />
      </Box>
      <Box mb={4}>
        <TextInput
          label="splitEventCohorts"
          value={formData.splitEventCohorts}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({ splitEventCohorts: e.target.value })
          }
        />
      </Box>
      <Box mb={4}>
        <TextInput
          label="splitTime"
          value={formData.splitTime}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({ splitTime: e.target.value })
          }
          type="number"
        />
      </Box>
      <Box mb={4}>
        <TextInput
          label="eraCollapseSize"
          value={formData.eraCollapseSize}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({ eraCollapseSize: e.target.value })
          }
          type="number"
        />
      </Box>
      <Box mb={4}>
        <TextInput
          label="combinationWindow"
          value={formData.combinationWindow}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({ combinationWindow: e.target.value })
          }
          type="number"
        />
      </Box>
      <Box mb={4}>
        <TextInput
          label="minPostCombinationDuration"
          value={formData.minPostCombinationDuration}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({ minPostCombinationDuration: e.target.value })
          }
          type="number"
        />
      </Box>
      <Box mb={4}>
        <FormControl variant="standard" fullWidth>
          <InputLabel shrink>filterTreatments</InputLabel>
          <Select
            value={formData.filterTreatments}
            onChange={(e: SelectChangeEvent) =>
              onFormDataChange({
                filterTreatments: e.target.value,
              })
            }
          >
            {Object.values(FilterTreatments).map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      <Box mb={4}>
        <TextInput
          label="maxPathLength"
          value={formData.maxPathLength}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({ maxPathLength: e.target.value })
          }
          type="number"
        />
      </Box>
      <Box mb={4}>
        <TextInput
          label="ageWindow"
          value={formData.ageWindow}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({ ageWindow: e.target.value })
          }
          type="number"
        />
      </Box>
      <Box mb={4}>
        <TextInput
          label="minCellCount"
          value={formData.minCellCount}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({ minCellCount: e.target.value })
          }
          type="number"
        />
      </Box>
      <Box mb={4}>
        <FormControl variant="standard" fullWidth>
          <InputLabel shrink>censorType</InputLabel>
          <Select
            value={formData.censorType}
            onChange={(e: SelectChangeEvent) =>
              onFormDataChange({
                CensorType: e.target.value,
              })
            }
          >
            {Object.values(CensorType).map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    </NodeDrawer>
  );
};
