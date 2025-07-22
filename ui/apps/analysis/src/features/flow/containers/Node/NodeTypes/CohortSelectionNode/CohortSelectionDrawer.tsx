import React, { ChangeEvent, FC, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import { NodeProps } from "reactflow";
import {
  Box,
  Button,
  IconButton,
  TextInput,
  InputLabel,
  MenuItem,
  FormControl,
  Select,
  SelectChangeEvent,
} from "@portal/components";
import ClearIcon from "@mui/icons-material/Clear";
import { NodeDrawer, NodeDrawerProps } from "../../NodeDrawer/NodeDrawer";
import { NodeChoiceMap } from "..";
import { useFormData } from "~/features/flow/hooks";
import {
  markStatusAsDraft,
  selectNodeById,
  setNode,
} from "~/features/flow/reducers";
import { NodeState } from "~/features/flow/types";
import { RootState, dispatch } from "~/store";
import { CohortSelectionNodeData } from "./CohortSelectionNode";
import { Cohort, CohortType } from "./CohortSelectionType";

export interface CohortSelectionDrawerProps
  extends Omit<NodeDrawerProps, "children"> {
  node: NodeProps<CohortSelectionNodeData>;
  onClose: () => void;
}

interface FormData extends CohortSelectionNodeData {}

const EMPTY_FORM_DATA: FormData = {
  name: "",
  type: CohortType.Event,
  cohorts: [],
};

export const CohortSelectionDrawer: FC<CohortSelectionDrawerProps> = ({
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
        type: node.data.type,
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

  const EMPTY_COHORT: Cohort = {
    cohortId: "",
    cohortName: "",
  };

  const handleAddCohort = useCallback(() => {
    onFormDataChange({
      cohorts: [EMPTY_COHORT, ...formData.cohorts],
    });
  }, [onFormDataChange, formData.cohorts]);

  return (
    <NodeDrawer {...props} width="500px" onOk={handleOk} onClose={onClose}>
      <Box mb={4}>
        <InputLabel shrink>Cohorts</InputLabel>
        <Button variant="text" text="Add Cohort" onClick={handleAddCohort} />
        {formData.cohorts.map((cohort, index) => (
          <Box
            key={index}
            display="flex"
            flexDirection="column"
            gap={1}
            marginTop="-1px"
          >
            <Box display="flex" gap={1} mb="-1px" alignItems="end">
              <TextInput
                label="Cohort Id"
                value={cohort.cohortId}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  onFormDataChange({
                    cohorts: formData.cohorts.map((cohort, i) =>
                      i === index
                        ? { ...cohort, cohortId: e.target.value }
                        : cohort
                    ),
                  })
                }
              />
              <TextInput
                label="Cohort Name"
                value={cohort.cohortName}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  onFormDataChange({
                    cohorts: formData.cohorts.map((cohort, i) =>
                      i === index
                        ? { ...cohort, cohortName: e.target.value }
                        : cohort
                    ),
                  })
                }
              />
              <IconButton
                startIcon={<ClearIcon />}
                onClick={() =>
                  onFormDataChange({
                    cohorts: formData.cohorts.filter((_, i) => i !== index),
                  })
                }
              />
            </Box>
          </Box>
        ))}
      </Box>
    </NodeDrawer>
  );
};
