import React, { ChangeEvent, FC, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import { NodeProps } from "reactflow";
import {
  Box,
  Checkbox,
  TextInput,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
import { NodeDrawer, NodeDrawerProps } from "../../NodeDrawer/NodeDrawer";
import { NodeChoiceMap } from "../../NodeTypes";
import { NegatveControlOutcomeNodeData } from "./NegativeControlOutcomeNode";

export interface NegatveControlOutcomeDrawerProps
  extends Omit<NodeDrawerProps, "children"> {
  node: NodeProps<NegatveControlOutcomeNodeData>;
  onClose: () => void;
}

interface FormData extends NegatveControlOutcomeNodeData {}

const OCCURENCE_TYPE_OPTIONS = ["first", "all"];
const EMPTY_FORM_DATA: FormData = {
  name: "",
  description: "",
  occurenceType: "all",
  detectOnDescendants: true,
};

export const NegatveControlOutcomeDrawer: FC<
  NegatveControlOutcomeDrawerProps
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
        occurenceType: node.data.occurenceType,
        detectOnDescendants: node.data.detectOnDescendants,
      });
    } else {
      setFormData({
        ...EMPTY_FORM_DATA,
        ...NodeChoiceMap["cohort_generator_node"].defaultData,
      });
    }
  }, [node.data]);

  const handleOk = useCallback(() => {
    const updated: NodeState<NegatveControlOutcomeNodeData> = {
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
        <FormControl variant="standard" fullWidth>
          <InputLabel shrink>OccurenceType</InputLabel>
          <Select
            value={formData.occurenceType}
            onChange={(e: SelectChangeEvent) =>
              onFormDataChange({ occurenceType: e.target.value })
            }
          >
            <MenuItem value="">&nbsp;</MenuItem>
            {OCCURENCE_TYPE_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      <Box mb={4}>
        <Checkbox
          checked={formData.detectOnDescendants}
          label="DetectOnDescendants"
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({
              detectOnDescendants: e.target.checked,
            })
          }
        />
      </Box>
    </NodeDrawer>
  );
};
