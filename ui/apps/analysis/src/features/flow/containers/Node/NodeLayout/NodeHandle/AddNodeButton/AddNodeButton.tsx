import React from "react";
import { IconButton, AddIcon } from "@portal/components";
import { dispatch } from "~/store";
import { setAddNodeTypeDialog } from "~/features/flow/reducers";
import "./AddNodeButton.scss";

export interface AddNodeButtonProps {
  nodeId: string;
  nodeClassifier: string;
  type: string;
  handleType: "input" | "output";
}

export const AddNodeButton = ({
  nodeId,
  nodeClassifier,
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
        selectedNodeClassifier: nodeClassifier,
      })
    );
  };

  return <IconButton startIcon={<AddIcon />} onClick={handleAddNode} />;
};
