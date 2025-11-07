import { Chip, ChipProps, Tooltip } from "@portal/components";
import React, { FC } from "react";

export interface ChipEllipsisProps extends ChipProps {
  maxLength?: number;
}

export const ChipEllipsis: FC<ChipEllipsisProps> = ({ maxLength = 20, label, ...chipProps }) => {
  const isEllipsis = typeof label === "string" && label.length > maxLength && maxLength > 0;

  if (isEllipsis) {
    return (
      <Tooltip title={label}>
        <Chip label={`${label.substring(0, maxLength)}...`} />
      </Tooltip>
    );
  }
  return <Chip label={label} {...chipProps} />;
};
