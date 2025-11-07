import React, { forwardRef } from "react";
import {
  default as MuiListItemButton,
  ListItemButtonProps as MuiListItemButtonProps,
} from "@mui/material/ListItemButton";

export type ListItemButtonProps = MuiListItemButtonProps;

const ListItemButtonInternal = (props: ListItemButtonProps, ref: React.Ref<any>) => (
  <MuiListItemButton {...props} ref={ref} />
);

export const ListItemButton = forwardRef(ListItemButtonInternal);
