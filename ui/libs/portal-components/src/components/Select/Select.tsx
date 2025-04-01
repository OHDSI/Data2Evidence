import React, { FC } from "react";
import classNames from "classnames";
import {
  default as MatSelect,
  SelectProps as MatSelectProps,
  SelectChangeEvent as MuiSelectChangeEvent,
} from "@mui/material/Select";

export const Select: FC<SelectProps> = ({ className, ...props }) => {
  const classes = classNames("alp-select", { [`${className}`]: !!className });
  return <MatSelect className={classes} variant="standard" data-testid="select" {...props} />;
};

export type SelectChangeEvent = MuiSelectChangeEvent;
export type SelectProps = MatSelectProps<string>;
