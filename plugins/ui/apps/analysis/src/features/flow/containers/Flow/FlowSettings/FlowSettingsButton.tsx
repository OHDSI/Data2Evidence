import React, { FC, useCallback, useState } from "react";
import { IconButton, SettingsGearIcon } from "@portal/components";
import { FlowSettingsDrawer } from "./FlowSettingsDrawer";

export interface FlowSettingsButtonProps {}

export const FlowSettingsButton: FC<FlowSettingsButtonProps> = () => {
  const [drawerVisible, setDrawerVisible] = useState(false);

  const handleClick = useCallback(() => {
    setDrawerVisible(true);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setDrawerVisible(false);
  }, []);

  return (
    <>
      <IconButton startIcon={<SettingsGearIcon />} onClick={handleClick} />
      <FlowSettingsDrawer open={drawerVisible} onClose={handleCloseDrawer} />
    </>
  );
};
