import React from "react";
import { NodeResizer, NodeProps } from "reactflow";
import { NodeDataState } from "../../../../types";
import "./GroupNode.scss";

export interface GroupNodeData extends NodeDataState {}

export const GroupNode = (
  node: NodeProps<GroupNodeData>,
  selected: boolean
) => {
  const { data } = node;
  return (
    <div className="group">
      <NodeResizer
        color="#999fcb"
        isVisible={selected}
        minWidth={550}
        minHeight={300}
      />
      <div style={{ padding: 10 }}>{data.name}</div>
    </div>
  );
};
