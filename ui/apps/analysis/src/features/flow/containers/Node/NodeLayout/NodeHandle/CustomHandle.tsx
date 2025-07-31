import React, { FC } from "react";
import { Handle, NodeProps, Position } from "reactflow";
import { HandleType } from "reactflow";
import { NodeType } from "../../NodeTypes";
import { AddNodeButton } from "./AddNodeButton/AddNodeButton";
import "./CustomHandle.scss";
import { hasGroupedInputs } from "../../NodeTypes/mapping";

export interface CustomHandleProps {
  name: string;
  color: string;
  type: HandleType;
  sourceNodeType?: NodeType;
  handleNodeType: string;
  node: NodeProps<any>;
  style: object;
}
export const CustomHandle = ({
  name,
  color,
  type,
  sourceNodeType,
  handleNodeType,
  node,
  style,
}: CustomHandleProps) => {
  const handleName =
    hasGroupedInputs(sourceNodeType) && sourceNodeType
      ? `${sourceNodeType}_${handleNodeType.toLowerCase().replace(" ", "")}`
      : handleNodeType;
  return (
    <div
      style={{
        position: "absolute",
        border: "1px solid #999fcb",
        borderRadius: "5px", // Rounded corners
        textAlign: "center",
        right: type === "source" ? "0px" : "auto",
        ...style,
      }}
    >
      <Handle
        className="custom-handle"
        type={type}
        id={`${node.id}_${type}_${handleName}`}
        position={type === "source" ? Position.Right : Position.Left}
        style={{
          position: "absolute",
          background: color,
          borderRadius: "3px",
          width: "14px",
          height: "100%",
        }}
      ></Handle>
      <span style={{ marginRight: "5px", marginLeft: "5px" }}>
        <AddNodeButton
          nodeId={node.id}
          nodeHandleType={handleNodeType}
          handleType={type == "source" ? "output" : "input"}
          type={node.type as NodeType}
        />
      </span>
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
