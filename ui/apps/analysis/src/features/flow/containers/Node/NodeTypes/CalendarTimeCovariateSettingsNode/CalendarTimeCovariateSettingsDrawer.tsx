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
import { CalendarTimeCovariateSettingsNodeData } from "./CalendarTimeCovariateSettingsNode";

export interface CalendarTimeCovariateSettingsDrawerProps
  extends Omit<NodeDrawerProps, "children"> {
  node: NodeProps<CalendarTimeCovariateSettingsNodeData>;
  onClose: () => void;
}

interface FormData extends CalendarTimeCovariateSettingsNodeData {}

const EMPTY_FORM_DATA: FormData = {
  name: "",
  description: "",
  caldendarTimeKnots: 5,
  allowRegularization: true,
  computeConfidenceIntervals: false,
};

export const CalendarTimeCovariateSettingsDrawer: FC<
  CalendarTimeCovariateSettingsDrawerProps
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
        caldendarTimeKnots: node.data.caldendarTimeKnots,
        allowRegularization: node.data.allowRegularization,
        computeConfidenceIntervals: node.data.computeConfidenceIntervals,
      });
    } else {
      setFormData({
        ...EMPTY_FORM_DATA,
        ...NodeChoiceMap["calendar_time_covariate_settings_node"].defaultData,
      });
    }
  }, [node.data]);

  const handleOk = useCallback(() => {
    const updated: NodeState<CalendarTimeCovariateSettingsNodeData> = {
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
          label="Calendar Time Knots"
          value={formData.caldendarTimeKnots}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({
              start: e.target.value,
            })
          }
          type="number"
        />
      </Box>
      <Box mb={4}>
        <Checkbox
          checked={formData.allowRegularization}
          label="Allow Regularization"
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({
              allowRegularization: e.target.checked,
            })
          }
        />
      </Box>
      <Box mb={4}>
        <Checkbox
          checked={formData.computeConfidenceIntervals}
          label="Compute Confidence Intervals"
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({
              computeConfidenceIntervals: e.target.checked,
            })
          }
        />
      </Box>
    </NodeDrawer>
  );
};
