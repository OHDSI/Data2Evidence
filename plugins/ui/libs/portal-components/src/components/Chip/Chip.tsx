import React, { forwardRef } from "react";
import { default as MuiChip, ChipProps as MuiChipProps } from "@mui/material/Chip";

export type ChipProps = MuiChipProps;

const ChipInternal = (props: ChipProps, ref: React.Ref<any>) => <MuiChip {...props} ref={ref} />;

export const Chip = forwardRef(ChipInternal);
