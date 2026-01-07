import React, { ChangeEvent, FC, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import { NodeProps } from "reactflow";
import {
  Box,
  TextInput,
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
  InputLabel,
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
import { NodeChoiceMap } from "../../NodeTypes";
import { TimeAtRiskNodeData } from "./TimeAtRiskNode";

export interface TimeAtRiskDrawerProps
  extends Omit<NodeDrawerProps, "children"> {
  node: NodeProps<TimeAtRiskNodeData>;
  onClose: () => void;
}

interface FormData extends TimeAtRiskNodeData {}

const EMPTY_FORM_DATA: FormData = {
  name: "",
  description: "",
  timeAtRiskId: undefined,
  startWith: "start",
  endWith: "end",
};

const START_END_WITH_OPTIONS = ["start", "end"];

export const TimeAtRiskDrawer: FC<TimeAtRiskDrawerProps> = ({
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
        timeAtRiskId: node.data.timeAtRiskId,
        startWith: node.data.startWith,
        endWith: node.data.endWith,
        startOffset: node.data.startOffset,
        endOffset: node.data.endOffset,
      });
    } else {
      setFormData({
        ...EMPTY_FORM_DATA,
        ...NodeChoiceMap["time_at_risk_node"].defaultData,
      });
    }
  }, [node.data]);

  const handleOk = useCallback(() => {
    const updated: NodeState<TimeAtRiskNodeData> = {
      ...nodeState,
      data: formData,
    };
    dispatch(setNode(updated));
    dispatch(markStatusAsDraft());

    typeof onClose === "function" && onClose();
  }, [formData]);

  return (
    <NodeDrawer {...props} width="800px" onOk={handleOk} onClose={onClose}>
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
          label="TimeAtRisk ID"
          value={formData.timeAtRiskId}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({ timeAtRiskId: e.target.value })
          }
          type="number"
        />
      </Box>
      <Box mb={4}>
        <FormControl variant="standard" fullWidth>
          <InputLabel shrink>Start With</InputLabel>
          <Select
            value={formData.startWith}
            onChange={(e: SelectChangeEvent) =>
              onFormDataChange({ startWith: e.target.value })
            }
          >
            <MenuItem value="">&nbsp;</MenuItem>
            {START_END_WITH_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      <Box mb={4}>
        <FormControl variant="standard" fullWidth>
          <InputLabel shrink>End With</InputLabel>
          <Select
            value={formData.endWith}
            onChange={(e: SelectChangeEvent) =>
              onFormDataChange({ endWith: e.target.value })
            }
          >
            <MenuItem value="">&nbsp;</MenuItem>
            {START_END_WITH_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      <Box mb={4}>
        <TextInput
          label="Start Offset"
          value={formData.startOffset}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({ startOffset: e.target.value })
          }
          type="number"
        />
      </Box>
      <Box mb={4}>
        <TextInput
          label="End Offset"
          value={formData.endOffset}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({ endOffset: e.target.value })
          }
          type="number"
        />
      </Box>
    </NodeDrawer>
  );
};
