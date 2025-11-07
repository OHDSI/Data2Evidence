import React, { forwardRef } from "react";
import { default as MuiTooltip, TooltipProps as MuiTooltipProps } from "@mui/material/Tooltip";

export type TooltipProps = MuiTooltipProps;

const TooltipInternal = (props: TooltipProps, ref: React.Ref<any>) => <MuiTooltip {...props} ref={ref} />;

export const Tooltip = forwardRef(TooltipInternal);
