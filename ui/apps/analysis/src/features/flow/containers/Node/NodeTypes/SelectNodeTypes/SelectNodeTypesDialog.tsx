import React, { ChangeEvent, FC, useCallback, useState, useMemo } from "react";
import { Box, Checkbox, Dialog, DialogProps } from "@portal/components";
import { NodeTypeSelection } from "./NodeTypeSelection";
import {
  NodeChoiceMap,
  NodeType,
  inputHandleTypeMap,
  outputHandleTypeMap,
} from "../index";
import { NodeTag, NodeTypeChoice } from "../type";
import { getAllNodeTypes } from "../mapping";
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
  handleType, // this should be renamed to handle direction type since its only "input" or "output"
  sourceNodeType,
  handleNodeType,
  ...props
}) => {
  const [hideExperimental, setHideExperimental] = useState(true);

  const handleClose = useCallback(
    (nodeType?: NodeTypeChoice) => {
      typeof onClose === "function" && onClose(nodeType);
    },
    [onClose]
  );

  const nodesToSelect = useMemo(() => {
    if (!handleNodeType) return getAllNodeTypes();
    return handleType === "input"
      ? Array.from(inputHandleTypeMap[handleNodeType])
      : Array.from(outputHandleTypeMap[handleNodeType]);
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
