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
import { PythonNodeData } from "./PythonNode";

export interface PythonDrawerProps extends Omit<NodeDrawerProps, "children"> {
  node: NodeProps<PythonNodeData>;
  onClose: () => void;
}

interface FormData extends PythonNodeData {}

interface FormError {
  name: { duplicate: boolean };
}

const EMPTY_FORM_DATA: FormData = {
  name: "",
  description: "",
  python_code: "",
  output_json_schema: "",
};

const EMPTY_FORM_ERROR: FormError = {
  name: { duplicate: false },
};

export const PythonDrawer: FC<PythonDrawerProps> = ({
  node,
  onClose,
  ...props
}) => {
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
        python_code: node.data.python_code,
        output_json_schema: node.data.output_json_schema,
      });
    } else {
      setFormData({
        ...EMPTY_FORM_DATA,
        ...NodeChoiceMap["python_node"].defaultData,
      });
    }
  }, [node.data]);

  const handleOk = useCallback(() => {
    if (isDuplicateNodeName(allNodes, node.id, formData.name)) {
      setFormError({ name: { duplicate: true } });
      return;
    }
    setFormError(EMPTY_FORM_ERROR);
    const updated: NodeState<PythonNodeData> = {
      ...nodeState,
      data: formData,
    };
    dispatch(setNode(updated));
    dispatch(markStatusAsDraft());

    typeof onClose === "function" && onClose();
  }, [formData, allNodes, node.id, nodeState, onClose]);

  return (
    <NodeDrawer {...props} onOk={handleOk} onClose={onClose}>
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
        language="python"
        value={formData.python_code}
        onChange={(python_code: string) => onFormDataChange({ python_code })}
        label="Write your python code here"
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
