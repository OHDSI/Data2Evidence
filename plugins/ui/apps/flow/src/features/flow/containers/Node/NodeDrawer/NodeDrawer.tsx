import React, { FC, useMemo } from "react";
import classNames from "classnames";
import { PaperProps } from "@mui/material";
import {
  Box,
  Button,
  CloseIcon,
  Drawer,
  DrawerProps,
  IconButton,
} from "@portal/components";
import "./NodeDrawer.scss";

export interface NodeDrawerProps extends DrawerProps {
  title: string;
  width?: string;
  onOk?: () => void;
  onClose?: () => void;
  className?: string;
  /** Hide the footer "Apply" button (e.g. for drawers that auto-persist on close). */
  hideFooter?: boolean;
  /** Optional element rendered in the header to the left of the title (e.g. a back arrow). */
  headerLeft?: React.ReactNode;
  children: React.ReactNode;
}

export const NodeDrawer: FC<NodeDrawerProps> = ({
  title,
  width = "80%",
  className,
  children,
  onOk,
  onClose,
  hideFooter = false,
  headerLeft,
  ...drawerProps
}) => {
  const classes = classNames("node-drawer", className);

  const paperProps: Partial<PaperProps> = useMemo(
    () => ({ style: { width } }),
    [width]
  );

  return (
    <Drawer
      anchor="right"
      className={classes}
      PaperProps={paperProps}
      onClose={onClose}
      {...drawerProps}
    >
      <div className="node-drawer__header">
        {headerLeft}
        <Box flexGrow={1}>{title}</Box>
        <Box>
          <IconButton
            startIcon={<CloseIcon />}
            aria-label="close"
            onClick={onClose}
          />
        </Box>
      </div>
      <div className="node-drawer__content">{children}</div>
      {!hideFooter && (
        <div className="node-drawer__footer">
          <Box display="flex" justifyContent="flex-end">
            <Button
              type="submit"
              className="node-drawer__submit"
              text="Apply"
              onClick={onOk}
            />
          </Box>
        </div>
      )}
    </Drawer>
  );
};
