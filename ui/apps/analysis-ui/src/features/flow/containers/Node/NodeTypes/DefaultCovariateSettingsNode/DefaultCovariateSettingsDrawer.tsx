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
import { DefaultCovariateSettingsNodeData } from "./DefaultCovariateSettingsNode";
import { CONFIGS_USER_INPUT_ARRAY_STYLES } from "../common";

export interface DefaultCovariateSettingsDrawerProps
  extends Omit<NodeDrawerProps, "children"> {
  node: NodeProps<DefaultCovariateSettingsNodeData>;
  onClose: () => void;
}

interface FormData extends DefaultCovariateSettingsNodeData {}

const EMPTY_FORM_DATA: FormData = {
  name: "",
  description: "",
  excludedCovariateConceptIds: [],
  includedCovariateConceptIds: [],
  addDescendantsToExclude: false,
  addDescendantsToInclude: false,
  includedCovariateIds: [],
};

export const DefaultCovariateSettingsDrawer: FC<
  DefaultCovariateSettingsDrawerProps
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
        excludedCovariateConceptIds: node.data.excludedCovariateConceptIds,
        includedCovariateConceptIds: node.data.includedCovariateConceptIds,
        addDescendantsToExclude: node.data.addDescendantsToExclude,
        addDescendantsToInclude: node.data.addDescendantsToInclude,
        includedCovariateIds: node.data.includedCovariateIds,
      });
    } else {
      setFormData({
        ...EMPTY_FORM_DATA,
        ...NodeChoiceMap["default_covariate_settings_node"].defaultData,
      });
    }
  }, [node.data]);

  const handleOk = useCallback(() => {
    const updated: NodeState<DefaultCovariateSettingsNodeData> = {
      ...nodeState,
      data: formData,
    };
    dispatch(setNode(updated));
    dispatch(markStatusAsDraft());

    typeof onClose === "function" && onClose();
  }, [formData]);

  const handleExcludedCovariateConceptIdsChange = useCallback(
    (event: any, value: string[]) => {
      onFormDataChange({ excludedCovariateConceptIds: value });
    },
    []
  );

  const handleIncludedCovariateIdsChange = useCallback(
    (event: any, value: string[]) => {
      onFormDataChange({ includedCovariateIds: value });
    },
    []
  );

  const handleIncludedCovariateConceptIdsChange = useCallback(
    (event: any, value: string[]) => {
      onFormDataChange({ includedCovariateConceptIds: value });
    },
    []
  );

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
        <Checkbox
          checked={formData.addDescendantsToExclude}
          label="AddDescendantsToExclude"
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({
              addDescendantsToExclude: e.target.checked,
            })
          }
        />
      </Box>
      <Box mb={4}>
        <Checkbox
          checked={formData.addDescendantsToInclude}
          label="AddDescendantsToInclude"
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({
              addDescendantsToInclude: e.target.checked,
            })
          }
        />
      </Box>
      <Box mb={4}>
        <Autocomplete
          multiple
          sx={CONFIGS_USER_INPUT_ARRAY_STYLES}
          value={formData.excludedCovariateConceptIds}
          onChange={handleExcludedCovariateConceptIdsChange}
          options={[]}
          freeSolo
          renderInput={(params) => (
            <TextField
              {...params}
              label="ExcludedCovariateConceptIds"
              placeholder="Enter Excluded Covariate Concept ID"
            />
          )}
        />
      </Box>
      <Box mb={4}>
        <Autocomplete
          multiple
          sx={CONFIGS_USER_INPUT_ARRAY_STYLES}
          value={formData.includedCovariateConceptIds}
          onChange={handleIncludedCovariateConceptIdsChange}
          options={[]}
          freeSolo
          renderInput={(params) => (
            <TextField
              {...params}
              label="IncludedCovariateConceptIds"
              placeholder="Enter Included Covariate Concept ID"
            />
          )}
        />
      </Box>
      <Box mb={4}>
        <Autocomplete
          multiple
          sx={CONFIGS_USER_INPUT_ARRAY_STYLES}
          value={formData.includedCovariateIds}
          onChange={handleIncludedCovariateIdsChange}
          options={[]}
          freeSolo
          renderInput={(params) => (
            <TextField
              {...params}
              label="IncludedCovariateIds"
              placeholder="Enter Included Covariate ID"
            />
          )}
        />
      </Box>
    </NodeDrawer>
  );
};
