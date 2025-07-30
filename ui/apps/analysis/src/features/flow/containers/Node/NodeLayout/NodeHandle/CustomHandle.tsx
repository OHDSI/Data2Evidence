import React, { FC } from "react";
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
  style: object;
}
export const CustomHandle = ({
  name,
  color,
  type,
  classifier,
  node,
  style,
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
        position={type === "source" ? Position.Right : Position.Left}
        style={{
          position: "absolute",
          background: color,
          borderRadius: "3px",
          width: "14px",
          height: "100%",
          left: "-10px",
        }}
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

export const OutputHandle: FC<Omit<CustomHandleProps, "type">> = (props) => (
  <CustomHandle type="source" {...props} />
);
export const InputHandle: FC<Omit<CustomHandleProps, "type">> = (props) => (
  <CustomHandle type="target" {...props} />
);
