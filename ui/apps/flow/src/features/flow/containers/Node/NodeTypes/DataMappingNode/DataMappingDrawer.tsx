import React, { FC, useCallback, useEffect, useMemo, useRef } from "react";
import { Node, NodeProps } from "reactflow";
import { useSelector, shallowEqual } from "react-redux";
import { useFormData } from "~/features/flow/hooks";
import { NodeState, NodeDataState } from "~/features/flow/types";
import { selectSourceNodes } from "~/features/flow/selectors";
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
import { WhiteRabbitNodeData } from "../WhiteRabbitNode/WhiteRabbitNode";
import isEqual from "lodash.isequal";

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
  const sourceNodes = useSelector(
    (state: RootState) =>
      selectSourceNodes(state, node.id) as Node<NodeDataState>[],
    shallowEqual
  );

  // Memoize sourceNodes by deep equality
  const stableSourceNodesRef = useRef<Node<NodeDataState>[] | null>(null);
  const [stableSourceNodes, setStableSourceNodes] = React.useState(sourceNodes);

  useEffect(() => {
    const whiteRabbitNodes = sourceNodes.filter(
      (n) => n.type === "white_rabbit_node"
    ) as Node<WhiteRabbitNodeData>[];
    if (
      stableSourceNodesRef.current === null ||
      !isEqual(stableSourceNodesRef.current, whiteRabbitNodes)
    ) {
      stableSourceNodesRef.current = whiteRabbitNodes;
      setStableSourceNodes(whiteRabbitNodes);
    }
  }, [sourceNodes]);

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
        ...NodeChoiceMap["rabbit_in_a_hat"].defaultData,
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
      sourceNode: stableSourceNodes[0],
      nodeId: node.id,
      onChange: (data: any) => onFormDataChange({ data }),
    };
  }, [
    node.data.data,
    pluginMetadata.data.mappingSuggestion,
    stableSourceNodes,
  ]);

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
