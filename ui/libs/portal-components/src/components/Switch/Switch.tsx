import React, { FC } from "react";
import classNames from "classnames";
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import { default as MuiSwitch, SwitchProps as MuiSwitchProps } from "@mui/material/Switch";

export interface SwitchProps extends MuiSwitchProps {
  title?: string;
}

export const Switch: FC<SwitchProps> = ({ title, className, ...props }) => {
  const classes = classNames("alp-switch", { [`${className}`]: !!className });

  return (
    <FormGroup className={classes} data-testid="switch">
      <FormControlLabel control={<MuiSwitch {...props} />} label={title} />
    </FormGroup>
  );
};
