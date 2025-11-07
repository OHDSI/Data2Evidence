import React, { forwardRef } from "react";
import { default as MuiList, ListProps as MuiListProps } from "@mui/material/List";

export type ListProps = MuiListProps;

const ListInternal = (props: ListProps, ref: React.Ref<any>) => <MuiList {...props} ref={ref} />;

export const List = forwardRef(ListInternal);
