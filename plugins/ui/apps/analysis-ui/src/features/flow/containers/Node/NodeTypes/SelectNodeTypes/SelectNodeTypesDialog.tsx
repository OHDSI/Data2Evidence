import React, { ChangeEvent, FC, useCallback, useState, useMemo } from "react";
import { Box, Checkbox, Dialog, DialogProps } from "@portal/components";
import { NodeTypeSelection } from "./NodeTypeSelection";
import {
  NodeChoiceMap,
  inputHandleTypeMap,
  outputHandleTypeMap,
} from "../index";
import { NodeTag, NodeTypeChoice } from "../type";
import "./SelectNodeTypesDialog.scss";

export interface SelectNodeTypesDialogProps
  extends Omit<DialogProps, "onClose"> {
  onClose: (nodeType?: NodeTypeChoice) => void;
  handleType: "input" | "output";
  handleNodeType?: string;
}

export const SelectNodeTypesDialog: FC<SelectNodeTypesDialogProps> = ({
  onClose,
  handleType, // this should be renamed to handle direction type since its only "input" or "output"
  handleNodeType,
  ...props
}) => {
  const [showExperimental, setShowExperimental] = useState(false);

  const handleClose = useCallback(
    (nodeType?: NodeTypeChoice) => {
      typeof onClose === "function" && onClose(nodeType);
    },
    [onClose],
  );

  const nodesToSelect: string[] = useMemo(() => {
    if (!handleNodeType) return Object.keys(NodeChoiceMap);
    return handleType === "input"
      ? Array.from(inputHandleTypeMap[handleNodeType])
      : Array.from(outputHandleTypeMap[handleNodeType]);
  }, [handleNodeType, handleType]);

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
            showExperimental
              ? true
              : NodeChoiceMap[nodeType].tag !== NodeTag.Experimental,
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
          label="Show experimental"
          checked={showExperimental}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setShowExperimental(e.target.checked)
          }
        />
      </Box>
    </Dialog>
  );
};
