import React, { ChangeEvent, FC, useCallback, useState, useMemo } from "react";
import { Box, Checkbox, Dialog, DialogProps } from "@portal/components";
import { NodeTypeSelection } from "./NodeTypeSelection";
import { NODE_COLORS, NodeChoiceMap, NodeType } from "../index";
import { NodeTag, NodeTypeChoice } from "../type";
import {
  getAllNodeTypes,
  getNodeInputGroups,
  getNodeInputs,
  getNodeOutputs,
  hasGroupedInputs,
} from "../mapping";
import "./SelectNodeTypesDialog.scss";

export interface SelectNodeTypesDialogProps
  extends Omit<DialogProps, "onClose"> {
  onClose: (nodeType?: NodeTypeChoice) => void;
  handleType: "input" | "output";
  sourceNodeType?: NodeType;
  handleNodeType?: string;
}

export const SelectNodeTypesDialog: FC<SelectNodeTypesDialogProps> = ({
  onClose,
  handleType,
  sourceNodeType,
  handleNodeType,
  ...props
}) => {
  const [hideExperimental, setHideExperimental] = useState(true);
  console.log("select handleNodeType:", handleNodeType);
  const handleClose = useCallback(
    (nodeType?: NodeTypeChoice) => {
      typeof onClose === "function" && onClose(nodeType);
    },
    [onClose]
  );

  const nodesToSelect = useMemo(() => {
    const allNodeTypes = getAllNodeTypes();
    if (!handleNodeType) {
      return allNodeTypes;
    }
    if (handleType === "input") {
      if (hasGroupedInputs(sourceNodeType)) {
        return getNodeInputGroups(sourceNodeType)
          .find((group) => group.name === handleNodeType)
          .connections.map((connection) => connection.node as NodeType);
      } else {
        return [handleNodeType as NodeType];
      }
    } else {
      return getNodeOutputs(sourceNodeType).map(
        (output) => output.node as NodeType
      );
    }
  }, [handleNodeType, handleType, sourceNodeType]);

  return (
    <Dialog
      className="select-node-type-dialog"
      title="Select node type"
      sx={{
        "& .MuiDialog-container": {
          "& .MuiPaper-root": {
            width: "100%",
            height: "100%",
            maxWidth: "650px",
          },
        },
      }}
      onClose={() => handleClose()}
      {...props}
    >
      <Box className="select-node-type-dialog__content">
        {nodesToSelect
          .filter((nodeType: NodeTypeChoice) =>
            hideExperimental
              ? NodeChoiceMap[nodeType].tag !== NodeTag.Experimental
              : true
          )
          .map((nodeType: NodeTypeChoice) => (
            <NodeTypeSelection
              key={nodeType}
              nodeType={nodeType}
              onClick={() => handleClose(nodeType)}
            />
          ))}
      </Box>
      <Box className="select-node-type-dialog__footer">
        <Checkbox
          label="Hide experimental"
          checked={hideExperimental}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setHideExperimental(e.target.checked)
          }
        />
      </Box>
    </Dialog>
  );
};
