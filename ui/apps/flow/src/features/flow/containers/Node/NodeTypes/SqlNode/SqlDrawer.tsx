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
import { SourceOptions, SourceTypes } from "../../SelectSource/SelectSource";
import { NodeChoiceMap } from "../../NodeTypes";
import { SqlNodeData } from "./SqlNode";
import "./SqlDrawer.scss";

export interface SqlDrawerProps extends Omit<NodeDrawerProps, "children"> {
  node: NodeProps<SqlNodeData>;
  onClose: () => void;
}

interface FormData extends SqlNodeData {}

interface FormError {
  name: { duplicate: boolean };
}

const EMPTY_FORM_DATA: FormData = {
  name: "",
  description: "",
  sql: "",
};

const EMPTY_FORM_ERROR: FormError = {
  name: { duplicate: false },
};

const sourceOptions: SourceOptions = {
  csv_node: [SourceTypes.NODE],
  transform_fhir_data_node: [SourceTypes.NODE],
  python_node: [SourceTypes.SCRIPT_NODE],
  r_node: [SourceTypes.SCRIPT_NODE],
};

export const SqlDrawer: FC<SqlDrawerProps> = ({ node, onClose, ...props }) => {
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
    if (isDuplicateNodeName(allNodes, node.id, formData.name)) {
      setFormError({ name: { duplicate: true } });
      return;
    }
    setFormError(EMPTY_FORM_ERROR);
    const updated: NodeState<SqlNodeData> = {
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
        language="sql"
        value={formData.sql}
        onChange={(sql: string) => onFormDataChange({ sql })}
        label="SQL"
        boxProps={{ mb: 0 }}
      />
    </NodeDrawer>
  );
};
