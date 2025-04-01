import React, { ChangeEvent, FC, useCallback, useState } from "react";
import { Box, Checkbox, Dialog, DialogProps } from "@portal/components";
import { NodeTypeSelection } from "./NodeTypeSelection";
import { NodeChoiceMap } from "../index";
import { NodeTag, NodeTypeChoice } from "../type";
import "./SelectNodeTypesDialog.scss";

export interface SelectNodeTypesDialogProps
  extends Omit<DialogProps, "onClose"> {
  onClose: (nodeType?: NodeTypeChoice) => void;
}

export const SelectNodeTypesDialog: FC<SelectNodeTypesDialogProps> = ({
  onClose,
  ...props
}) => {
  const [hideExperimental, setHideExperimental] = useState(true);

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
