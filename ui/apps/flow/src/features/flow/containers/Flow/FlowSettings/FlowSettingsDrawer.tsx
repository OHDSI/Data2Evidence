import React, { FC, useCallback } from "react";
import {
  Box,
  Drawer,
  DrawerProps,
  CloseIcon,
  IconButton,
  Switch,
} from "@portal/components";
import "./FlowSettingsDrawer.scss";
import { TestModeSwitch } from "../../TestMode/TestModeSwitch";

export interface FlowSettingsDrawerProps extends DrawerProps {
  onClose?: () => void;
}

export const FlowSettingsDrawer: FC<FlowSettingsDrawerProps> = ({
  onClose,
  ...drawerProps
}) => {
  const handleClose = useCallback(() => {
    typeof onClose === "function" && onClose();
  }, [onClose]);

  return (
    <Drawer
      anchor="right"
      className="flow-settings-drawer"
      PaperProps={{ style: { width: "500px" } }}
      onClose={onClose}
      {...drawerProps}
    >
      <div className="flow-settings-drawer__header">
        <Box flexGrow={1}>Settings</Box>
        <Box>
          <IconButton
            startIcon={<CloseIcon />}
            aria-label="close"
            onClick={handleClose}
          />
        </Box>
      </div>
      <div className="flow-settings-drawer__content">
        <TestModeSwitch />
      </div>
    </Drawer>
  );
};
