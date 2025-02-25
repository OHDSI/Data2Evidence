import React, { ChangeEvent, FC, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import { NodeProps } from "reactflow";
import {
  Box,
  Checkbox,
  TextInput,
  IconButton,
  AddSquareIcon,
  Autocomplete,
  TextField,
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
import { CohortIncidentNodeData } from "./CohortIncidentNode";
import {
  CohortRefsForm,
  EMPTY_COHORTREFS_FORM_DATA,
} from "./CohortRefsForm/CohortRefsForm";
import { CONFIGS_USER_INPUT_ARRAY_STYLES } from "../common";
import "./CohortIncidentNode.scss";

export interface CohortIncidentDrawerProps
  extends Omit<NodeDrawerProps, "children"> {
  node: NodeProps<CohortIncidentNodeData>;
  onClose: () => void;
}

interface FormData extends CohortIncidentNodeData {}

const EMPTY_FORM_DATA: FormData = {
  name: "",
  description: "",
  strataSettings: {
    byYear: true,
    byGender: true,
  },
  cohortRefs: [],
  incidenceAnalysis: {
    targets: [],
    outcomes: [],
    tars: [],
  },
};

export const CohortIncidentDrawer: FC<CohortIncidentDrawerProps> = ({
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
        strataSettings: node.data.strataSettings,
        cohortRefs: node.data.cohortRefs,
        incidenceAnalysis: node.data.incidenceAnalysis,
      });
    } else {
      setFormData({
        ...EMPTY_FORM_DATA,
        ...NodeChoiceMap["cohort_incidence_node"].defaultData,
      });
    }
  }, [node.data]);

  const handleOk = useCallback(() => {
    const updated: NodeState<CohortIncidentNodeData> = {
      ...nodeState,
      data: formData,
    };
    dispatch(setNode(updated));
    dispatch(markStatusAsDraft());

    typeof onClose === "function" && onClose();
  }, [formData]);

  const handleRemove = useCallback(
    (indexToRemove: number) => {
      onFormDataChange({
        cohortRefs: [
          ...formData.cohortRefs.slice(0, indexToRemove),
          ...formData.cohortRefs.slice(indexToRemove + 1),
        ],
      });
    },
    [formData]
  );

  const handleChange = useCallback(
    (indexToUpdate: number, name: string, id: string, description: string) => {
      onFormDataChange({
        cohortRefs: [
          ...formData.cohortRefs.slice(0, indexToUpdate),
          {
            ...formData.cohortRefs[indexToUpdate],
            name,
            id,
            description,
          },
          ...formData.cohortRefs.slice(indexToUpdate + 1),
        ],
      });
    },
    [formData]
  );

  const handleTargetsChange = useCallback(
    (event: any, value: string[]) => {
      onFormDataChange({
        incidenceAnalysis: { ...formData.incidenceAnalysis, targets: value },
      });
    },
    [formData]
  );
  const handleOutcomesChange = useCallback(
    (event: any, value: string[]) => {
      onFormDataChange({
        incidenceAnalysis: { ...formData.incidenceAnalysis, outcomes: value },
      });
    },
    [formData]
  );
  const handleTarsChange = useCallback(
    (event: any, value: string[]) => {
      onFormDataChange({
        incidenceAnalysis: { ...formData.incidenceAnalysis, tars: value },
      });
    },
    [formData]
  );

  return (
    <NodeDrawer {...props} width="700px" onOk={handleOk} onClose={onClose}>
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
      <Box className="box-section">
        <div style={{ paddingBottom: "20px" }}>Cohort Refs</div>
        {formData.cohortRefs.length !== 0 &&
          formData.cohortRefs.map((data, index) => (
            <CohortRefsForm
              key={index}
              index={index}
              configs={data}
              onRemove={() => handleRemove(index)}
              onChange={(name: string, id: string, description: string) =>
                handleChange(index, name, id, description)
              }
            />
          ))}
        <Box mt={2}>
          <IconButton
            startIcon={<AddSquareIcon />}
            title="Add Cohort Refs"
            onClick={() =>
              setFormData((prevFormData) => ({
                ...prevFormData,
                cohortRefs: [
                  ...prevFormData.cohortRefs,
                  EMPTY_COHORTREFS_FORM_DATA,
                ],
              }))
            }
          />
        </Box>
      </Box>
      <Box className="box-section">
        <div style={{ paddingBottom: "20px" }}>Incidence Analysis</div>
        <Box mb={4}>
          <Autocomplete
            multiple
            sx={CONFIGS_USER_INPUT_ARRAY_STYLES}
            value={formData.incidenceAnalysis.targets}
            onChange={handleTargetsChange}
            options={[]}
            freeSolo
            renderInput={(params) => (
              <TextField
                {...params}
                label="Targets"
                placeholder="Enter Targets"
              />
            )}
          />
        </Box>
        <Box mb={4}>
          <Autocomplete
            multiple
            sx={CONFIGS_USER_INPUT_ARRAY_STYLES}
            value={formData.incidenceAnalysis.outcomes}
            onChange={handleOutcomesChange}
            options={[]}
            freeSolo
            renderInput={(params) => (
              <TextField
                {...params}
                label="Outcomes"
                placeholder="Enter Outcomes"
              />
            )}
          />
        </Box>
        <Box mb={4}>
          <Autocomplete
            multiple
            sx={CONFIGS_USER_INPUT_ARRAY_STYLES}
            value={formData.incidenceAnalysis.tars}
            onChange={handleTarsChange}
            options={[]}
            freeSolo
            renderInput={(params) => (
              <TextField {...params} label="Tars" placeholder="Enter Tars" />
            )}
          />
        </Box>
      </Box>
      <Box className="box-section">
        <div style={{ paddingBottom: "20px" }}>Strata Settings</div>
        <Box mb={4}>
          <Checkbox
            checked={formData.strataSettings.byYear}
            label="By Year"
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onFormDataChange({
                strataSettings: {
                  ...formData.strataSettings,
                  byYear: e.target.checked,
                },
              })
            }
          />
        </Box>
        <Box mb={4}>
          <Checkbox
            checked={formData.strataSettings.byGender}
            label="By Gender"
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onFormDataChange({
                strataSettings: {
                  ...formData.strataSettings,
                  byGender: e.target.checked,
                },
              })
            }
          />
        </Box>
      </Box>
    </NodeDrawer>
  );
};
