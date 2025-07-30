import React from "react";
import { IconButton, AddIcon } from "@portal/components";
import { dispatch } from "~/store";
import { setAddNodeTypeDialog } from "~/features/flow/reducers";
import { NodeType } from "../../../NodeTypes";
import "./AddNodeButton.scss";

export interface AddNodeButtonProps {
  nodeId: string;
  nodeHandleType: NodeType;
  type: NodeType;
  handleType: "input" | "output";
}

export const AddNodeButton = ({
  nodeId,
  nodeHandleType,
  type,
  handleType,
}: AddNodeButtonProps) => {
  const handleAddNode = () => {
    dispatch(
      setAddNodeTypeDialog({
        visible: true,
        nodeType: type,
        handleType,
        selectedNodeId: nodeId,
        selectedNodeHandleType: nodeHandleType,
      })
    );
  };

  return <IconButton startIcon={<AddIcon />} onClick={handleAddNode} />;
};
