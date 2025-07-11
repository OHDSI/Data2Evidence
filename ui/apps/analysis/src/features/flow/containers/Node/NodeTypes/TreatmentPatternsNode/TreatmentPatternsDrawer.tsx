import React, { ChangeEvent, FC, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import { NodeProps } from "reactflow";
import { Box } from "@portal/components";
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
      <Box mb={4}>hello</Box>
    </NodeDrawer>
  );
};
