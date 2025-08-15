import React, { useMemo } from "react";
import { Handle, NodeProps, Position } from "reactflow";
import classNames from "classnames";
import {
  Box,
  EditNoBoxIcon,
  DragIndicatorIcon,
  Button,
} from "@portal/components";
import { InputHandle } from "./NodeHandle/CustomHandle";
import { NodeDataState } from "../../../types";
import {
  INBOUND_CONNECTOR_STYLES,
  OUTBOUND_CONNECTOR_STYLE,
  NodeType,
  HandleIODict,
  NodeChoiceMap,
  NodeConnection,
} from "../NodeTypes";
import "./NodeLayout.scss";

export interface NodeLayoutProps<T> {
  name?: string;
  resultType?: "error" | "success";
  onResultClick?: () => void;
  onSettingClick?: () => void;
  className?: string;
  children: React.ReactNode;
  node: NodeProps<T>;
}

export const NodeLayout = <T extends NodeDataState>({
  name: title,
  resultType = "success",
  onResultClick,
  onSettingClick,
  className,
  children,
  node,
}: NodeLayoutProps<T>) => {
  const classes = classNames("node", className, {
    "node--has-setting": typeof onSettingClick === "function",
    "node--has-error": resultType === "error",
  });

  const PLAIN_NODES = ["patient_level_prediction_node"];

  const inputHandles = useMemo(() => {
    const handles: NodeConnection[] = NodeChoiceMap[node.type]?.inputs ?? [];
    const inputNodeIncidenceNumber = handles.length;

    return handles.map((input, index) => (
      <InputHandle
        key={input.label}
        name={input.label}
        color={HandleIODict[input.handleType].color}
        sourceNodeType={node.type as NodeType}
        handleNodeType={input.handleType}
        node={node}
        style={{
          top: INBOUND_CONNECTOR_STYLES[inputNodeIncidenceNumber][index],
          display: "flex",
          alignItems: "center",
        }}
      />
    ));
  }, []);

  // Right now, we only support one output handle per node.
  const outputHandles = useMemo(() => {
    const handles: NodeConnection[] = NodeChoiceMap[node.type]?.outputs ?? [];

    return handles.map((output) => (
      <Handle
        type="source"
        key={`${node.id}_source_${output.label}_${output.handleType}`}
        id={`${node.id}_source_${output.label}_${output.handleType}`}
        position={Position.Right}
        style={{
          background: HandleIODict[output.handleType].color,
          ...OUTBOUND_CONNECTOR_STYLE,
        }}
      />
    ));
  }, [node]);

  return (
    <div className={classes}>
      {inputHandles}
      {outputHandles}
      <div className="node__header">
        <Box display="inline-flex" mr={1}>
          <DragIndicatorIcon className="node__drag" />
        </Box>
        <Box flexGrow={1} className="node__title">
          {title}
        </Box>
        <Box display="flex" gap={2}>
          {typeof onSettingClick === "function" &&
            !PLAIN_NODES.includes(node.type) && (
              <Box display="inline-flex">
                <EditNoBoxIcon
                  onClick={onSettingClick}
                  className="node__setting nodrag"
                />
              </Box>
            )}
        </Box>
      </div>
      {typeof onResultClick === "function" && (
        <div className="node__footer">
          <Button
            text={`View ${resultType === "error" ? "error" : "output"}`}
            variant="outlined"
            color={resultType === "error" ? "error" : "primary"}
            onClick={onResultClick}
          />
        </div>
      )}
    </div>
  );
};
