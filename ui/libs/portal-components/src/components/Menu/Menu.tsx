import React, { forwardRef } from "react";
import { default as MuiMenu, MenuProps as MuiMenuProps } from "@mui/material/Menu";

export type MenuProps = MuiMenuProps;

const MenuInternal = (props: MenuProps, ref: React.Ref<any>) => <MuiMenu {...props} ref={ref} />;

export const Menu = forwardRef(MenuInternal);
