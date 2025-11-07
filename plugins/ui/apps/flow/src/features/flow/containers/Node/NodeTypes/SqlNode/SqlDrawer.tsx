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
import { SourceOptions, SourceTypes } from "../../SelectSource/SelectSource";
import { NodeChoiceMap } from "../../NodeTypes";
import { SqlNodeData } from "./SqlNode";
import "./SqlDrawer.scss";

export interface SqlDrawerProps extends Omit<NodeDrawerProps, "children"> {
  node: NodeProps<SqlNodeData>;
  onClose: () => void;
}

interface FormData extends SqlNodeData {}

const EMPTY_FORM_DATA: FormData = {
  name: "",
  description: "",
  sql: "",
};

const sourceOptions: SourceOptions = {
  csv_node: [SourceTypes.NODE],
  python_node: [SourceTypes.SCRIPT_NODE],
  python_notebook_node: [SourceTypes.SCRIPT_NODE],
  r_node: [SourceTypes.SCRIPT_NODE],
};

export const SqlDrawer: FC<SqlDrawerProps> = ({ node, onClose, ...props }) => {
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
        sql: node.data.sql,
      });
    } else {
      setFormData({
        ...EMPTY_FORM_DATA,
        ...NodeChoiceMap["sql_node"].defaultData,
      });
    }
  }, [node.data]);

  const handleOk = useCallback(() => {
    const updated: NodeState<SqlNodeData> = {
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
        language="sql"
        value={formData.sql}
        onChange={(sql: string) => onFormDataChange({ sql })}
        label="SQL"
        boxProps={{ mb: 0 }}
      />
    </NodeDrawer>
  );
};
