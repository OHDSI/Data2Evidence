import React, { ChangeEvent, FC, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import { NodeProps } from "reactflow";
import { Box, TextField, TextInput } from "@portal/components";
import { useFormData } from "~/features/flow/hooks";
import {
  markStatusAsDraft,
  selectNodeById,
  setNode,
} from "~/features/flow/reducers";
import { NodeState } from "~/features/flow/types";
import { RootState, dispatch } from "~/store";
import { NodeDrawer, NodeDrawerProps } from "../../NodeDrawer/NodeDrawer";
import {
  SelectSource,
  SourceOptions,
  SourceTypes,
} from "../../SelectSource/SelectSource";
import { NodeChoiceMap } from "..";
import { SourceToTableMap, Py2TableNodeData } from "./Py2TableNode";
import "./Py2TableDrawer.scss";

export interface Py2TableDrawerProps extends Omit<NodeDrawerProps, "children"> {
  node: NodeProps<Py2TableNodeData>;
  onClose: () => void;
}

interface FormData extends Omit<Py2TableNodeData, "map"> {}

const JSON_PATH_PREFIX = "$.";
const SCRIPT_NODE_INDICATOR = `.${SourceTypes.SCRIPT_NODE}`;

const EMPTY_FORM_DATA: FormData = {
  name: "",
  description: "",
  uiMap: { source: "", path: "" },
};

const sourceOptions: SourceOptions = {
  python_node: [SourceTypes.SCRIPT_NODE],
  python_notebook_node: [SourceTypes.SCRIPT_NODE],
  r_node: [SourceTypes.SCRIPT_NODE],
};

export const Py2TableDrawer: FC<Py2TableDrawerProps> = ({
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
      const uiMap = {
        source: node.data.uiMap?.source,
        path: node.data.uiMap?.path,
      } as SourceToTableMap;

      setFormData({
        name: node.data.name,
        description: node.data.description,
        uiMap,
      });
    } else {
      setFormData({
        ...EMPTY_FORM_DATA,
        ...NodeChoiceMap["sql_node"].defaultData,
      });
    }
  }, [node.data]);

  const handleOk = useCallback(() => {
    const tableName = node.data.name;

    let tables: { [key: string]: any } = {};
    if (formData.uiMap?.source?.endsWith(SCRIPT_NODE_INDICATOR)) {
      const scriptNodeIndex = formData.uiMap?.source?.indexOf(
        SCRIPT_NODE_INDICATOR
      );
      const path = formData.uiMap?.path.startsWith(JSON_PATH_PREFIX)
        ? formData.uiMap?.path.substring(
            JSON_PATH_PREFIX.length,
            formData.uiMap?.path.length
          )
        : formData.uiMap?.path;

      tables = {
        [tableName]: [
          formData.uiMap?.source?.substring(0, scriptNodeIndex)!,
          ...path.split("."),
        ],
      };
    }

    const updated: NodeState<Py2TableNodeData> = {
      ...nodeState,
      data: { ...formData, map: tables },
    };
    dispatch(setNode(updated));
    dispatch(markStatusAsDraft());

    typeof onClose === "function" && onClose();
  }, [formData, node.data.name]);

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
      <Box mb={4} width="100%" overflow="auto">
        <Box display="flex" alignItems="flex-end" gap={3} mb={1}>
          <Box sx={{ width: "350px" }}>
            <SelectSource
              fullWidth
              nodeId={node.id}
              sourceOptions={sourceOptions}
              label="Source"
              value={formData.uiMap?.source}
              onChange={(value: string) =>
                onFormDataChange({
                  uiMap: {
                    ...formData.uiMap,
                    source: value,
                  } as SourceToTableMap,
                })
              }
            />
          </Box>
          <Box sx={{ width: "200px" }}>
            <TextField
              variant="standard"
              sx={{ width: "200px" }}
              label="JSON Path"
              value={formData.uiMap?.path}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onFormDataChange({
                  uiMap: {
                    ...formData.uiMap,
                    path: e.target.value,
                  } as SourceToTableMap,
                })
              }
            />
          </Box>
        </Box>
      </Box>
    </NodeDrawer>
  );
};
