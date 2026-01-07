import React, { ChangeEvent, FC, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import { NodeProps } from "reactflow";
import {
  Box,
  TextInput,
  Checkbox,
  Autocomplete,
  TextField,
  FormControl,
  InputLabel,
  MenuItem,
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
import { NodeDrawer, NodeDrawerProps } from "../../NodeDrawer/NodeDrawer";
import { NodeChoiceMap } from "..";
import { EraCovariateSettingsNodeData } from "./EraCovariateSettingsNode";
import { CONFIGS_USER_INPUT_ARRAY_STYLES } from "../common";

export interface EraCovariateSettingsDrawerProps
  extends Omit<NodeDrawerProps, "children"> {
  node: NodeProps<EraCovariateSettingsNodeData>;
  onClose: () => void;
}

interface FormData extends EraCovariateSettingsNodeData {}

const EMPTY_FORM_DATA: FormData = {
  name: "",
  description: "",
  label: "",
  includedEraIds: [],
  excludedEraIds: [],
  start: 0,
  end: 0,
  startAnchor: "era start",
  endAnchor: "era end",
  stratifyById: false,
  firstOccurenceOnly: false,
  allowRegularization: false,
  profileLikelihood: true,
  exposureOfInterest: true,
};

const START_END_ANCHOR_OPTIONS = ["era start", "era end"];

export const EraCovariateSettingsDrawer: FC<
  EraCovariateSettingsDrawerProps
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
        label: node.data.label,
        includedEraIds: node.data.includedEraIds,
        excludedEraIds: node.data.excludedEraIds,
        start: node.data.start,
        end: node.data.end,
        startAnchor: node.data.startAnchor,
        endAnchor: node.data.endAnchor,
        stratifyById: node.data.stratifyById,
        firstOccurenceOnly: node.data.firstOccurenceOnly,
        allowRegularization: node.data.allowRegularization,
        profileLikelihood: node.data.profileLikelihood,
        exposureOfInterest: node.data.exposureOfInterest,
      });
    } else {
      setFormData({
        ...EMPTY_FORM_DATA,
        ...NodeChoiceMap["era_covariate_settings_node"].defaultData,
      });
    }
  }, [node.data]);

  const handleOk = useCallback(() => {
    const updated: NodeState<EraCovariateSettingsNodeData> = {
      ...nodeState,
      data: formData,
    };
    dispatch(setNode(updated));
    dispatch(markStatusAsDraft());

    typeof onClose === "function" && onClose();
  }, [formData]);

  const handleExcludedEraIdsChange = useCallback(
    (event: any, value: string[]) => {
      onFormDataChange({ excludedEraIds: value });
    },
    []
  );

  const handleIncludedEraIdsChange = useCallback(
    (event: any, value: string[]) => {
      onFormDataChange({ includedEraIds: value });
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
        <TextInput
          label="Label"
          value={formData.label}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({ label: e.target.value })
          }
        />
      </Box>
      <Box mb={4}>
        <Autocomplete
          multiple
          sx={CONFIGS_USER_INPUT_ARRAY_STYLES}
          value={formData.includedEraIds}
          onChange={handleIncludedEraIdsChange}
          options={[]}
          freeSolo
          renderInput={(params) => (
            <TextField
              {...params}
              label="IncludedEraIds"
              placeholder="Enter Included Era ID"
            />
          )}
        />
      </Box>
      <Box mb={4}>
        <Autocomplete
          multiple
          sx={CONFIGS_USER_INPUT_ARRAY_STYLES}
          value={formData.excludedEraIds}
          onChange={handleExcludedEraIdsChange}
          options={[]}
          freeSolo
          renderInput={(params) => (
            <TextField
              {...params}
              label="ExcludedEraIds"
              placeholder="Enter Excluded Era ID"
            />
          )}
        />
      </Box>
      <Box mb={4}>
        <TextInput
          label="start"
          value={formData.start}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({
              start: e.target.value,
            })
          }
          type="number"
        />
      </Box>
      <Box mb={4}>
        <TextInput
          label="end"
          value={formData.end}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({
              end: e.target.value,
            })
          }
          type="number"
        />
      </Box>
      <Box mb={4}>
        <FormControl variant="standard" fullWidth>
          <InputLabel shrink>Start Anchor</InputLabel>
          <Select
            value={formData.startAnchor}
            onChange={(e: SelectChangeEvent) =>
              onFormDataChange({ startAnchor: e.target.value })
            }
          >
            <MenuItem value="">&nbsp;</MenuItem>
            {START_END_ANCHOR_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      <Box mb={4}>
        <FormControl variant="standard" fullWidth>
          <InputLabel shrink>End Anchor</InputLabel>
          <Select
            value={formData.endAnchor}
            onChange={(e: SelectChangeEvent) =>
              onFormDataChange({ endAnchor: e.target.value })
            }
          >
            <MenuItem value="">&nbsp;</MenuItem>
            {START_END_ANCHOR_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      <Box mb={4}>
        <Checkbox
          checked={formData.stratifyById}
          label="Stratify By ID"
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({
              stratifyById: e.target.checked,
            })
          }
        />
      </Box>
      <Box mb={4}>
        <Checkbox
          checked={formData.firstOccurenceOnly}
          label="First Occurence Only"
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({
              firstOccurenceOnly: e.target.checked,
            })
          }
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
          checked={formData.profileLikelihood}
          label="Profile Likelihood"
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({
              profileLikelihood: e.target.checked,
            })
          }
        />
      </Box>
      <Box mb={4}>
        <Checkbox
          checked={formData.exposureOfInterest}
          label="Exposure of Interest"
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({
              exposureOfInterest: e.target.checked,
            })
          }
        />
      </Box>
    </NodeDrawer>
  );
};
