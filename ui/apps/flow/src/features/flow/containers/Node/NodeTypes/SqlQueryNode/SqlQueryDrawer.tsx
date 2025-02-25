import React, { ChangeEvent, FC, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import { NodeProps } from "reactflow";
import { Box, Checkbox, TextInput } from "@portal/components";
import { Editor } from "~/components/Editor/Editor";
import { useFormData } from "~/features/flow/hooks";
import {
  markStatusAsDraft,
  selectNodeById,
  setNode,
} from "~/features/flow/reducers";
import { NodeState } from "~/features/flow/types";
import { RootState, dispatch } from "~/store";
import { isValidJson } from "~/utils";
import { NodeDrawer, NodeDrawerProps } from "../../NodeDrawer/NodeDrawer";
import { NodeChoiceMap } from "../../NodeTypes";
import { SqlQueryNodeData } from "./SqlQueryNode";

export interface SqlQueryDrawerProps extends Omit<NodeDrawerProps, "children"> {
  node: NodeProps<SqlQueryNodeData>;
  onClose: () => void;
}

interface FormData extends Omit<SqlQueryNodeData, "params"> {
  params: string;
}

const EMPTY_FORM_DATA: FormData = {
  name: "",
  description: "",
  database: "",
  sqlquery: "",
  is_select: false,
  params: "",
  testsqlquery: "",
};

export const SqlQueryDrawer: FC<SqlQueryDrawerProps> = ({
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
        database: node.data.database,
        sqlquery: node.data.sqlquery,
        is_select: node.data.is_select,
        params: JSON.stringify(node.data.params, null, 2),
        testsqlquery: node.data.testsqlquery,
      });
    } else {
      setFormData({
        ...EMPTY_FORM_DATA,
        ...NodeChoiceMap["sql_query_node"].defaultData,
      });
    }
  }, [node.data]);

  const handleOk = useCallback(() => {
    let params: { [key: string]: any } = {};
    if (isValidJson(formData.params)) {
      params = JSON.parse(formData.params);
    }

    const updated: NodeState<SqlQueryNodeData> = {
      ...nodeState,
      data: { ...formData, params },
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
      <Box mb={4}>
        <TextInput
          label="Database"
          value={formData.database}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({ database: e.target.value })
          }
        />
      </Box>
      <Editor
        language="sql"
        value={formData.sqlquery}
        onChange={(sqlquery: string) => onFormDataChange({ sqlquery })}
        label="SQL query"
      />
      <Box mb={4}>
        <Checkbox
          checked={formData.is_select}
          label="Does the query has a return value?"
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({ is_select: e.target.checked })
          }
        />
      </Box>
      <Editor
        language="json"
        value={formData.params}
        onChange={(params: string) => onFormDataChange({ params })}
        label="Params"
      />
      <Editor
        language="sql"
        value={formData.testsqlquery}
        onChange={(testsqlquery: string) => onFormDataChange({ testsqlquery })}
        label="Test SQL query"
        boxProps={{ mb: 0 }}
      />
    </NodeDrawer>
  );
};
