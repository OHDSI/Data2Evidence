import React, { ChangeEvent, FC, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import { NodeProps } from "reactflow";
import {
  Box,
  TextInput,
  Autocomplete,
  TextField,
  Checkbox,
} from "@portal/components";
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
import { OutcomesNodeData } from "./OutcomesNode";
import { CONFIGS_USER_INPUT_ARRAY_STYLES } from "../common";

export interface OutcomesDrawerProps extends Omit<NodeDrawerProps, "children"> {
  node: NodeProps<OutcomesNodeData>;
  onClose: () => void;
}

interface FormData extends OutcomesNodeData {}

const EMPTY_FORM_DATA: FormData = {
  name: "",
  description: "",
  ncoCohortSetIds: [],
  outcomeOfInterest: false,
  trueEffectSize: 1,
  priorOutcomeLookback: 30,
};

export const OutcomesDrawer: FC<OutcomesDrawerProps> = ({
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
        ncoCohortSetIds: node.data.ncoCohortSetIds,
        outcomeId: node.data.outcomeId,
        outcomeOfInterest: node.data.outcomeOfInterest,
        trueEffectSize: node.data.trueEffectSize,
        priorOutcomeLookback: node.data.priorOutcomeLookback,
        riskWindowStart: node.data.riskWindowStart,
        riskWindowEnd: node.data.riskWindowEnd,
        startAnchor: node.data.startAnchor,
        endAnchor: node.data.endAnchor,
      });
    } else {
      setFormData({
        ...EMPTY_FORM_DATA,
        ...NodeChoiceMap["outcomes_node"].defaultData,
      });
    }
  }, [node.data]);

  const handleOk = useCallback(() => {
    const updated: NodeState<OutcomesNodeData> = {
      ...nodeState,
      data: formData,
    };
    dispatch(setNode(updated));
    dispatch(markStatusAsDraft());

    typeof onClose === "function" && onClose();
  }, [formData]);

  const handleNCOCohortSetIdsChange = useCallback(
    (event: any, value: string[]) => {
      onFormDataChange({ ncoCohortSetIds: value });
    },
    []
  );

  // TODO: implement remaining optional parameters other than the example ones
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
        <Autocomplete
          multiple
          sx={CONFIGS_USER_INPUT_ARRAY_STYLES}
          value={formData.ncoCohortSetIds}
          onChange={handleNCOCohortSetIdsChange}
          options={[]}
          freeSolo
          renderInput={(params) => (
            <TextField
              {...params}
              label="NCO Cohort Set Ids"
              placeholder="Enter NCO Cohort Set ID"
            />
          )}
        />
      </Box>
      <Box mb={4}>
        <TextInput
          label="True Effect Size"
          value={formData.trueEffectSize}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({
              trueEffectSize: e.target.value,
            })
          }
          type="number"
        />
      </Box>
      <Box mb={4}>
        <TextInput
          label="Prior Outcome Lookback"
          value={formData.priorOutcomeLookback}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({
              priorOutcomeLookback: e.target.value,
            })
          }
          type="number"
        />
      </Box>
      <Box mb={4}>
        <Checkbox
          checked={formData.outcomeOfInterest}
          label="Outcome of Interest"
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({
              outcomeOfInterest: e.target.checked,
            })
          }
        />
      </Box>
    </NodeDrawer>
  );
};
