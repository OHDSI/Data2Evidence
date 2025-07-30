import React, { useMemo } from "react";
import { NodeProps } from "reactflow";
import classNames from "classnames";
import {
  Box,
  EditNoBoxIcon,
  DragIndicatorIcon,
  Button,
} from "@portal/components";
import { InputHandle, OutputHandle } from "./NodeHandle/CustomHandle";
import { NodeDataState } from "../../../types";
import {
  getInputCount,
  getOutputCount,
  getNodeInputs,
  getNodeOutputs,
} from "../../Node/NodeTypes/mapping";
import { INBOUND_CONNECTOR_STYLES, NodeType } from "../NodeTypes";
import { NODE_COLORS } from "../NodeTypes";
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

  const inputNodeIncidenceNumber = getInputCount(node.type as NodeType);
  const outputNodeIncidenceNumber = getOutputCount(node.type as NodeType);

  const inputHandles = useMemo(() => {
    return getNodeInputs(node.type as NodeType).map((input, index) => (
      <InputHandle
        key={input.name}
        name={input.name}
        color={NODE_COLORS[input.node]}
        classifier={input.node}
        node={node}
        style={{
          top: INBOUND_CONNECTOR_STYLES[inputNodeIncidenceNumber][index],
          display: "flex",
          alignItems: "center",
        }}
      />
    ));
  }, [node, inputNodeIncidenceNumber]);

  const outputHandles = useMemo(() => {
    return getNodeOutputs(node.type as NodeType).map((output, index) => (
      <OutputHandle
        key={output.name}
        name={output.name}
        color={NODE_COLORS[output.node]}
        classifier={output.node}
        node={node}
        style={{
          top: INBOUND_CONNECTOR_STYLES[outputNodeIncidenceNumber][index],
          display: "flex",
          alignItems: "center",
        }}
      />
    ));
  }, [node, outputNodeIncidenceNumber]);

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
