import React, { ChangeEvent, FC, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import { NodeProps } from "reactflow";
import { Box, TextInput } from "@portal/components";
import { Editor } from "~/components/Editor/Editor";
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
import { RNodeData } from "./RNode";

export interface RDrawerProps extends Omit<NodeDrawerProps, "children"> {
  node: NodeProps<RNodeData>;
  onClose: () => void;
}

interface FormData extends RNodeData {}

const EMPTY_FORM_DATA: FormData = {
  name: "",
  description: "",
  r_code: "",
  output_json_schema: "",
};

export const RDrawer: FC<RDrawerProps> = ({ node, onClose, ...props }) => {
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
    const updated: NodeState<RNodeData> = {
      ...nodeState,
      data: formData,
    };
    dispatch(setNode(updated));
    dispatch(markStatusAsDraft());

    typeof onClose === "function" && onClose();
  }, [formData]);

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
