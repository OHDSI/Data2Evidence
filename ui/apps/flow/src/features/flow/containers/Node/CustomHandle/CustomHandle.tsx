import { Tooltip } from "@portal/components";
import React, { FC } from "react";
import { Handle, HandleProps, Position } from "reactflow";
import { HandleIODict, HandleIOType } from "../NodeTypes";

export interface CustomHandleProps extends Omit<HandleProps, "position"> {
  nodeId: string;
  ioType: HandleIOType;
}

const CustomHandle: FC<CustomHandleProps> = ({
  nodeId,
  type,
  ioType,
  ...props
}) => (
  <Tooltip title={HandleIODict[ioType].text}>
    <Handle
      type={type}
      id={`${type}_${nodeId}_${ioType}`}
      position={type === "source" ? Position.Right : Position.Left}
      style={{
        background: HandleIODict[ioType].color,
        border: HandleIODict[ioType].border,
      }}
      {...props}
    />
  </Tooltip>
);

export const SourceHandle: FC<Omit<CustomHandleProps, "type">> = (props) => (
  <CustomHandle type="source" {...props} />
);
export const TargetHandle: FC<Omit<CustomHandleProps, "type">> = (props) => (
  <CustomHandle type="target" {...props} />
);
