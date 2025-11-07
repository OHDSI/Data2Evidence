import React, { forwardRef } from "react";
import { default as MuiListItem, ListItemProps as MuiListItemProps } from "@mui/material/ListItem";

export type ListItemProps = MuiListItemProps;

const ListItemInternal = (props: ListItemProps, ref: React.Ref<any>) => <MuiListItem {...props} ref={ref} />;

export const ListItem = forwardRef(ListItemInternal);
