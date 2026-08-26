import React, { FC, useCallback } from "react";
import { IconButton, EmptyFileIcon, Tooltip } from "@portal/components";
import { dispatch } from "~/store";
import { setSaveFlowDialog } from "~/features/flow/reducers";

export interface SaveNewFlowButtonProps {}

export const SaveNewFlowButton: FC<SaveNewFlowButtonProps> = () => {
  const handleClick = useCallback(() => {
    dispatch(setSaveFlowDialog({ visible: true, dataflowId: null }));
  }, []);

  return (
    <Tooltip title="Add Dataflow">
      <div>
        <IconButton aria-label="Add Dataflow" startIcon={<EmptyFileIcon />} onClick={handleClick} />
      </div>
    </Tooltip>
  );
};
