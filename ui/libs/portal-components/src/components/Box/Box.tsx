import React, { forwardRef } from "react";
import { default as MuiBox, BoxProps as MuiBoxProps } from "@mui/material/Box";

export type BoxProps = MuiBoxProps;

const BoxInternal = (props: BoxProps, ref: React.Ref<any>) => <MuiBox {...props} ref={ref} />;

export const Box = forwardRef(BoxInternal);
