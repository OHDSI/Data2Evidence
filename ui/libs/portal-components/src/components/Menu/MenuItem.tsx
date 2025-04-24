import React, { forwardRef } from "react";
import { default as MuiMenuItem, MenuItemProps as MuiMenuItemProps } from "@mui/material/MenuItem";

export type MenuItemProps = MuiMenuItemProps;

const MenuItemInternal = (props: MenuItemProps, ref: React.Ref<any>) => <MuiMenuItem {...props} ref={ref} />;

export const MenuItem = forwardRef(MenuItemInternal);
