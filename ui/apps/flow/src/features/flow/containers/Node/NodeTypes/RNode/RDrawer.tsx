import React, { ChangeEvent, FC, useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { NodeProps } from "reactflow";
import FormHelperText from "@mui/material/FormHelperText";
import { Box, TextInput } from "@portal/components";
import { Editor } from "~/components/Editor/Editor";
import { useFormData } from "~/features/flow/hooks";
import {
  markStatusAsDraft,
  selectNodeById,
  selectNodes,
  setNode,
} from "~/features/flow/reducers";
import { NodeState } from "~/features/flow/types";
import { isDuplicateNodeName } from "~/features/flow/utils";
import { RootState, dispatch } from "~/store";
import { NodeDrawer, NodeDrawerProps } from "../../NodeDrawer/NodeDrawer";
import { NodeChoiceMap } from "../../NodeTypes";
import { RNodeData } from "./RNode";

export interface RDrawerProps extends Omit<NodeDrawerProps, "children"> {
  node: NodeProps<RNodeData>;
  onClose: () => void;
}

interface FormData extends RNodeData {}

interface FormError {
  name: { duplicate: boolean };
}

const EMPTY_FORM_DATA: FormData = {
  name: "",
  description: "",
  r_code: "",
  output_json_schema: "",
};

const EMPTY_FORM_ERROR: FormError = {
  name: { duplicate: false },
};

export const RDrawer: FC<RDrawerProps> = ({ node, onClose, ...props }) => {
  const { formData, setFormData, onFormDataChange } =
    useFormData<FormData>(EMPTY_FORM_DATA);
  const nodeState = useSelector((state: RootState) =>
    selectNodeById(state, node.id)
  );
  const [formError, setFormError] = useState<FormError>(EMPTY_FORM_ERROR);
  const allNodes = useSelector(selectNodes);

  useEffect(() => {
    if (node.data) {
      setFormData({
        name: node.data.name,
        description: node.data.description,
        r_code: node.data.r_code,
        output_json_schema: node.data.output_json_schema,
      });
    } else {
      setFormData({
        ...EMPTY_FORM_DATA,
        ...NodeChoiceMap["r_node"].defaultData,
      });
    }
  }, [node.data]);

  const handleOk = useCallback(() => {
    if (isDuplicateNodeName(allNodes, node.id, formData.name)) {
      setFormError({ name: { duplicate: true } });
      return;
    }
    setFormError(EMPTY_FORM_ERROR);
    const updated: NodeState<RNodeData> = {
      ...nodeState,
      data: formData,
    };
    dispatch(setNode(updated));
    dispatch(markStatusAsDraft());

    typeof onClose === "function" && onClose();
  }, [formData, allNodes, node.id, nodeState, onClose]);

  const handleClose = useCallback(() => {
    setFormError(EMPTY_FORM_ERROR);
    typeof onClose === "function" && onClose();
  }, [onClose]);

  return (
    <NodeDrawer {...props} onOk={handleOk} onClose={handleClose}>
      <Box mb={4}>
        <TextInput
          label="Name"
          value={formData.name}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({ name: e.target.value })
          }
        />
        {formError.name.duplicate && (
          <FormHelperText error>
            Duplicate node name exists, please use another name
          </FormHelperText>
        )}
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
      <Editor
        language="r"
        value={formData.r_code}
        onChange={(r_code: string) => onFormDataChange({ r_code })}
        label="Write your R code here"
        boxProps={{ flex: "5 1 0", mb: 0 }}
      />
      {/* <Editor
        language="json"
        value={formData.output_json_schema}
        onChange={(output_json_schema: string) =>
          onFormDataChange({ output_json_schema })
        }
        label='Output JSON schema (use "Main" as the object)'
        boxProps={{ mb: 0 }}
      /> */}
    </NodeDrawer>
  );
};
