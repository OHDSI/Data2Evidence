import React, { FC, useCallback, useState } from "react";
import { IconButton, MenuIcon } from "@portal/components";
import { FlowListDrawer } from "./FlowListDrawer";

export interface FlowListButtonProps {}

export const FlowListButton: FC<FlowListButtonProps> = () => {
  const [drawerVisible, setDrawerVisible] = useState(false);

  const handleClick = useCallback(() => {
    setDrawerVisible(true);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setDrawerVisible(false);
  }, []);

  return (
    <>
      <IconButton startIcon={<MenuIcon />} onClick={handleClick} />
      <FlowListDrawer open={drawerVisible} onClose={handleCloseDrawer} />
    </>
  );
};
