import React, { forwardRef } from "react";
import { default as MuiDrawer, DrawerProps as MuiDrawerProps } from "@mui/material/Drawer";

export type DrawerProps = MuiDrawerProps;

const DrawerInternal = (props: DrawerProps, ref: React.Ref<any>) => <MuiDrawer {...props} ref={ref} />;

export const Drawer = forwardRef(DrawerInternal);
