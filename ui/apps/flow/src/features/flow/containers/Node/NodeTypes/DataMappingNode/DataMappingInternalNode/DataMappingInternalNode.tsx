import React, { useCallback } from "react";
import { Handle, Position } from "reactflow";
import { Box } from "@portal/components";
import classNames from "classnames";
import "./DataMappingInternalNode.scss";

export const DataMappingInternalNode = ({ data, isConnectable }) => {
  const { label, type } = data;
  const isInput = type === "input";

  return (
    <div
      className={classNames(
        "data-mapping-internal-node",
        { "data-mapping-internal-node__input": isInput },
        { "data-mapping-internal-node__output": !isInput }
      )}
    >
      <Box flexGrow={1} className="data-mapping-internal-node__header">
        {label}
      </Box>
      <Handle
        type={isInput ? "source" : "target"}
        position={isInput ? Position.Right : Position.Left}
      />
    </div>
  );
};
