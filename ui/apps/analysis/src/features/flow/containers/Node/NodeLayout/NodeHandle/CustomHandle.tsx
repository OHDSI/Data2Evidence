import React from "react";
import { Connection, Handle, NodeProps, Position } from "reactflow";
import { HandleType } from "reactflow";
import { AddNodeButton } from "./AddNodeButton/AddNodeButton";
import "./CustomHandle.scss";

export interface CustomHandleProps {
  name: string;
  color: string;
  type: HandleType;
  classifier: string;
  node: NodeProps<any>;
  position: Position;
  style: object;
  onConnect: (connection: Connection) => void;
}
export const CustomHandle = ({
  name,
  color,
  type,
  classifier,
  node,
  position,
  style,
  onConnect,
}: CustomHandleProps) => {
  return (
    <div
      style={{
        position: "absolute",
        border: "1px solid #999fcb",
        borderRadius: "5px", // Rounded corners
        textAlign: "center",
        ...style,
      }}
    >
      <Handle
        className="custom-handle"
        type={type}
        id={`${node.id}_target_${classifier}_${color}`}
        position={position}
        style={{
          position: "absolute",
          background: color,
          borderRadius: "3px",
          width: "14px",
          height: "100%",
          left: "-10px",
        }}
        onConnect={onConnect}
      ></Handle>
      <span style={{ marginRight: "5px", marginLeft: "5px" }}>
        <AddNodeButton
          nodeId={node.id}
          nodeClassifier={classifier}
          type={color}
        />
      </span>{" "}
      <span style={{ marginRight: "5px" }}>{name}</span>
    </div>
  );
};
