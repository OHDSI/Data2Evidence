import React, { FC, useCallback, useEffect, useMemo } from "react";
import { Node, NodeProps } from "reactflow";
import { useSelector, shallowEqual } from "react-redux";
import { useFormData } from "~/features/flow/hooks";
import { NodeState, NodeDataState } from "~/features/flow/types";
import { selectSourceNodes } from "~/features/flow/selectors";
import { dispatch, RootState } from "~/store";
import { pluginMetadata } from "~/FlowApp";
import {
  markStatusAsDraft,
  replaceEdges,
  selectEdges,
  selectNodeById,
  setNode,
} from "~/features/flow/reducers";
import { NodeDrawer, NodeDrawerProps } from "../../NodeDrawer/NodeDrawer";
import { PluginRenderer } from "../../../Plugin/PluginRenderer";
import { NodeChoiceMap } from "../../NodeTypes";
import { ConceptMappingNodeData } from "./ConceptMappingNode";
import "./ConceptMappingNode.scss";

export interface ConceptMappingDrawerProps
  extends Omit<NodeDrawerProps, "children"> {
  node: NodeProps<ConceptMappingNodeData>;
  onClose: () => void;
}

interface FormData extends ConceptMappingNodeData {}

const EMPTY_FORM_DATA: FormData = {
  name: "",
  description: "",
  data: {},
};

export const ConceptMappingDrawer: FC<ConceptMappingDrawerProps> = ({
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
    (state: RootState) => selectSourceNodes(state, node.id) as Node<NodeDataState>[],
    shallowEqual
  );
  const upstream = sourceNodes[0];
  const edges = useSelector(selectEdges);

  // Disconnects this Concept Mapping node from its upstream source by removing every edge
  // whose target is this node (its incoming connection) - triggered from the plugin's
  // connected-node card (the unlink icon).
  const onDisconnectSource = useCallback(() => {
    dispatch(replaceEdges(edges.filter((e) => e.target !== node.id)));
    dispatch(markStatusAsDraft());
  }, [edges, node.id]);

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
        ...NodeChoiceMap["concept_mapping_node"].defaultData,
      });
    }
  }, [node.data]);

  const handleOk = useCallback(() => {
    const updated: NodeState<ConceptMappingNodeData> = {
      ...nodeState,
      data: formData,
    };
    dispatch(setNode(updated));
    dispatch(markStatusAsDraft());

    typeof onClose === "function" && onClose();
  }, [formData]);

  const pluginData = useMemo(() => {
    const sourceNode = upstream
      ? {
          name: upstream.data?.name ?? "",
          type: upstream.type ?? "",
          description: upstream.data?.description ?? "",
          map: (upstream.data as any)?.map,
          result: (upstream.data as any)?.result,
        }
      : undefined;
    return {
      mappingSuggestion: pluginMetadata.data.mappingSuggestion,
      data: node.data.data,
      sourceNode,
      onChange: (data: any) => onFormDataChange({ data }),
      onDisconnectSource,
    };
  }, [node.data.data, pluginMetadata.data.mappingSuggestion, upstream, onDisconnectSource]);

  return (
    <NodeDrawer
      {...props}
      disableEnforceFocus
      width="1400px"
      onOk={handleOk}
      onClose={onClose}
    >
      <PluginRenderer
        path="/resources/concept-mapping/module.js"
        userId={pluginMetadata.userId}
        getToken={pluginMetadata.getToken}
        data={pluginData}
      />
    </NodeDrawer>
  );
};
