import React, { FC, useCallback, useState } from "react";
import HistoryIcon from "@mui/icons-material/History";
import { IconButton, Tooltip } from "@portal/components";
import { FlowRevisionListDrawer } from "./FlowRevisionListDrawer";

export interface FlowRevisionsButtonProps {}

export const FlowRevisionsButton: FC<FlowRevisionsButtonProps> = () => {
  const [drawerVisible, setDrawerVisible] = useState(false);

  const handleClick = useCallback(() => {
    setDrawerVisible(true);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setDrawerVisible(false);
  }, []);

  return (
    <>
      <Tooltip title="Show version history">
        <div>
          <IconButton
            startIcon={<HistoryIcon sx={{ width: 28, height: 30 }} />}
            onClick={handleClick}
          />
        </div>
      </Tooltip>
      <FlowRevisionListDrawer
        open={drawerVisible}
        onClose={handleCloseDrawer}
      />
    </>
  );
};
