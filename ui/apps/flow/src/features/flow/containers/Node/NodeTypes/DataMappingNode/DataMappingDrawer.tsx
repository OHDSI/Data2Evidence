import React, { FC, useCallback, useEffect, useMemo } from "react";
import { NodeProps } from "reactflow";
import { useSelector } from "react-redux";
import { useFormData } from "~/features/flow/hooks";
import { NodeState } from "~/features/flow/types";
import { dispatch, RootState } from "~/store";
import { pluginMetadata } from "~/FlowApp";
import {
  markStatusAsDraft,
  selectNodeById,
  setNode,
} from "~/features/flow/reducers";
import { NodeDrawer, NodeDrawerProps } from "../../NodeDrawer/NodeDrawer";
import { PluginRenderer } from "../../../Plugin/PluginRenderer";
import { NodeChoiceMap } from "../../NodeTypes";
import { DataMappingNodeData } from "./DataMappingNode";
import "./DataMappingNode.scss";

export interface DataMappingDrawerProps
  extends Omit<NodeDrawerProps, "children"> {
  node: NodeProps<DataMappingNodeData>;
  onClose: () => void;
}

interface FormData extends DataMappingNodeData {}

const EMPTY_FORM_DATA: FormData = {
  name: "",
  description: "",
  data: {},
};

export const DataMappingDrawer: FC<DataMappingDrawerProps> = ({
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
        data: node.data.data,
      });
    } else {
      setFormData({
        ...EMPTY_FORM_DATA,
        ...NodeChoiceMap["data_mapping_node"].defaultData,
      });
    }
  }, [node.data]);

  const handleOk = useCallback(() => {
    const updated: NodeState<DataMappingNodeData> = {
      ...nodeState,
      data: formData,
    };
    dispatch(setNode(updated));
    dispatch(markStatusAsDraft());

    typeof onClose === "function" && onClose();
  }, [formData]);

  const pluginData = useMemo(() => {
    return {
      mappingSuggestion: pluginMetadata.data.mappingSuggestion,
      data: node.data.data,
      onChange: (data: any) => onFormDataChange({ data }),
    };
  }, [node.data.data, pluginMetadata.data.mappingSuggestion]);

  return (
    <NodeDrawer {...props} width="1400px" onOk={handleOk} onClose={onClose}>
      <PluginRenderer
        path="/mapping/module.js"
        userId={pluginMetadata.userId}
        getToken={pluginMetadata.getToken}
        data={pluginData}
      />
    </NodeDrawer>
  );
};
