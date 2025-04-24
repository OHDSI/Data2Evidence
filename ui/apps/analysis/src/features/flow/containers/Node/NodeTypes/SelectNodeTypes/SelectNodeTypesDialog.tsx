import React, { FC, useCallback } from "react";
import { Box, Dialog, DialogProps } from "@portal/components";
import { NodeTypeSelection } from "./NodeTypeSelection";
import { NodeChoiceMap } from "../index";
import { NodeTypeChoice } from "../type";
import "./SelectNodeTypesDialog.scss";

export interface SelectNodeTypesDialogProps
  extends Omit<DialogProps, "onClose"> {
  onClose: (nodeType?: NodeTypeChoice) => void;
  connectorType?: string;
}

export const SelectNodeTypesDialog: FC<SelectNodeTypesDialogProps> = ({
  onClose,
  connectorType,
  ...props
}) => {
  const handleClose = useCallback(
    (nodeType?: NodeTypeChoice) => {
      typeof onClose === "function" && onClose(nodeType);
    },
    [onClose]
  );

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
        {Object.keys(NodeChoiceMap)
          .filter((nodeType: NodeTypeChoice) =>
            connectorType ? NodeChoiceMap[nodeType].tag === connectorType : true
          )
          .map((nodeType: NodeTypeChoice) => (
            <NodeTypeSelection
              key={nodeType}
              nodeType={nodeType}
              onClick={() => handleClose(nodeType)}
            />
          ))}
      </Box>
      <Box className="select-node-type-dialog__footer"></Box>
    </Dialog>
  );
};
