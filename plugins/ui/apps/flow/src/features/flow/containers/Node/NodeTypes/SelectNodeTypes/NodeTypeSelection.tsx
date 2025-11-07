import React, { FC } from "react";
import { Box, Chip } from "@portal/components";
import { NodeChoiceMap } from "../index";
import "./NodeTypeSelection.scss";

export interface NodeTypeSelectionProps {
  nodeType: string;
  onClick: () => void;
}

export const NodeTypeSelection: FC<NodeTypeSelectionProps> = ({
  nodeType,
  onClick,
}) => {
  return (
    <Box className="node-type-selection" onClick={onClick}>
      <div className="node-type-selection__title">
        {NodeChoiceMap[nodeType].title}
      </div>
      <div className="node-type-selection__tag">
      <Chip
        label={NodeChoiceMap[nodeType].tag}
        variant="filled"
        size="small"
        />
      </div>
      <div className="node-type-selection__desc">
        {NodeChoiceMap[nodeType].description}
      </div>
    </Box>
  );
};
