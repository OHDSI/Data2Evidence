import React, { useCallback, useState } from "react";
import { Connection, Handle, NodeProps, Position } from "reactflow";
import classNames from "classnames";
import {
  Box,
  EditNoBoxIcon,
  DragIndicatorIcon,
  Button,
} from "@portal/components";
import { CustomHandle } from "./NodeHandle/CustomHandle";
import { NodeDataState } from "../../../types";
import {
  ZERO_INCIDENCE_NODE,
  ONE_INCIDENCE_NODE,
  TWO_INCIDENCE_NODE,
  THREE_INCIDENCE_NODE,
  FOUR_INCIDENCE_NODE,
  FIVE_INCIDENCE_NODE,
  NODE_CONNECTOR_MAPPING,
  OUTBOUND_CONNECTOR_STYLE,
  INBOUND_CONNECTOR_STYLES,
  NodeConnector,
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
  const [sourceConnected, setSourceConnected] = useState<string | null>(null);
  const [targetConnected, setTargetConnected] = useState<string | null>(null);

  const NODE_COLOR = NODE_CONNECTOR_MAPPING[node.type].type;
  const PLAIN_NODES = ["patient_level_prediction_node"];

  const getIncidenceNumber = (type: string) => {
    switch (true) {
      case ZERO_INCIDENCE_NODE.includes(type):
        return 0;
      case ONE_INCIDENCE_NODE.includes(type):
        return 1;
      case TWO_INCIDENCE_NODE.includes(type):
        return 2;
      case THREE_INCIDENCE_NODE.includes(type):
        return 3;
      case FOUR_INCIDENCE_NODE.includes(type):
        return 4;
      case FIVE_INCIDENCE_NODE.includes(type):
        return 5;
      default:
        return -1;
    }
  };

  const nodeIncidenceNumber = getIncidenceNumber(node.type);

  const handleConnectSource = useCallback((connection: Connection) => {
    setSourceConnected(connection.source);
  }, []);

  const handleConnectTarget = useCallback((connection: Connection) => {
    setTargetConnected(connection.target);
  }, []);

  return (
    <div className={classes}>
      {NODE_CONNECTOR_MAPPING[node.type].connector_list.map(
        (connector: NodeConnector, index: number) => {
          return (
            <CustomHandle
              name={connector.name}
              color={connector.type}
              type={"target"}
              classifier={connector.classifier}
              node={node}
              position={Position.Left}
              style={{
                top: INBOUND_CONNECTOR_STYLES[nodeIncidenceNumber][index],
                display: "flex",
                alignItems: "center",
              }}
              onConnect={handleConnectTarget}
            />
          );
        }
      )}
      <Handle
        type="source"
        id={`${node.id}_source_${NODE_COLOR}`}
        style={{
          background: NODE_COLOR,
          ...OUTBOUND_CONNECTOR_STYLE,
        }}
        position={Position.Right}
        onConnect={handleConnectSource}
      />
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
