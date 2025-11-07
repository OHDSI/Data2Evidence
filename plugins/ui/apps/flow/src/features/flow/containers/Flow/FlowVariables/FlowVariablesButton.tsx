import React, { FC, useCallback, useState } from "react";
import { useSelector } from "react-redux";
import { Badge } from "@mui/material";
import { IconButton, Tooltip, VariableIcon } from "@portal/components";
import { RootState } from "~/store";
import { FlowVariablesDrawer } from "./FlowVariablesDrawer";

export interface FlowVariablesButtonProps {}

export const FlowVariablesButton: FC<FlowVariablesButtonProps> = ({}) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const variables = useSelector((state: RootState) => state.flow.variables);

  const handleClick = useCallback(() => {
    setDrawerVisible(true);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setDrawerVisible(false);
  }, []);

  return (
    <>
      <Tooltip title="Variables">
        <div>
          <Badge
            badgeContent={variables?.length}
            color="default"
            invisible={variables?.length === 0}
            anchorOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
            sx={{
              "& .MuiBadge-badge": {
                top: "2px",
                right: "4px",
              },
            }}
          >
            <IconButton
              startIcon={<VariableIcon width={24} />}
              onClick={handleClick}
            />
          </Badge>
        </div>
      </Tooltip>
      <FlowVariablesDrawer open={drawerVisible} onClose={handleCloseDrawer} />
    </>
  );
};
