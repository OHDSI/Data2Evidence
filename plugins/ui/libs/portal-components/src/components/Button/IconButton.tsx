import React, { FC } from "react";
import { default as MuiButton, ButtonProps as MuiButtonProps } from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import classNames from "classnames";
import "./IconButton.scss";

export interface IconButtonProps extends MuiButtonProps {
  loading?: boolean;
  disabled?: boolean;
}

export const IconButton: FC<IconButtonProps> = ({ loading, disabled, startIcon, className, ...rest }) => {
  const icon = loading ? <CircularProgress size={24} className="button--loading" /> : startIcon;
  const hasTitle = !!rest.title;
  const classes = classNames(
    "alp-icon-button",
    { "alp-icon-button--icon-only": !hasTitle },
    { [`${className}`]: !!className }
  );

  return (
    <MuiButton
      disableElevation
      startIcon={icon}
      className={classes}
      style={{ textTransform: "none" }}
      disabled={loading || disabled}
      {...rest}
    >
      {rest.title}
    </MuiButton>
  );
};
