import React, { ReactNode } from "react";
import { NodeProps } from "reactflow";
import classNames from "classnames";
import {
  Box,
  EditNoBoxIcon,
  DragIndicatorIcon,
  Button,
} from "@portal/components";
import { NodeDataState } from "../../../types";
import { HandleIOType } from "../NodeTypes";
import { SourceHandle, TargetHandle } from "../CustomHandle/CustomHandle";
import "./NodeLayout.scss";

export interface NodeLayoutProps<T> {
  name?: string;
  resultType?: "error" | "success";
  onResultClick?: () => void;
  onSettingClick?: () => void;
  className?: string;
  children: React.ReactNode;
  node: NodeProps<T>;
  RightHandle?: ReactNode | "default" | null;
  LeftHandle?: ReactNode | "default" | null;
}

export const NodeLayout = <T extends NodeDataState>({
  name: title,
  resultType = "success",
  onResultClick,
  onSettingClick,
  className,
  children,
  node,
  RightHandle = "default",
  LeftHandle = "default",
}: NodeLayoutProps<T>) => {
  const classes = classNames("node", className, {
    "node--has-setting": typeof onSettingClick === "function",
    "node--has-error": resultType === "error",
  });

  return (
    <div className={classes}>
      {RightHandle === "default" ? (
        <SourceHandle ioType={HandleIOType.Any} nodeId={node.id} />
      ) : (
        RightHandle
      )}
      {LeftHandle === "default" ? (
        <TargetHandle ioType={HandleIOType.Any} nodeId={node.id} />
      ) : (
        LeftHandle
      )}

      <div className="node__header">
        <Box display="inline-flex" mr={1}>
          <DragIndicatorIcon className="node__drag" />
        </Box>
        <Box flexGrow={1} className="node__title">
          {title}
        </Box>
        <Box display="flex" gap={2}>
          {typeof onSettingClick === "function" && (
            <Box display="inline-flex">
              <EditNoBoxIcon
                onClick={onSettingClick}
                className="node__setting nodrag"
              />
            </Box>
          )}
        </Box>
      </div>
      <div className="node__content">{children}</div>
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
