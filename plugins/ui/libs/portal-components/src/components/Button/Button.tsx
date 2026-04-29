import React, { AllHTMLAttributes, forwardRef } from "react";
import { default as MuiButton, ButtonProps as MuiButtonProps } from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import classNames from "classnames";
import "./Button.scss";

export type Ref = HTMLButtonElement;

export type ButtonProps = MuiButtonProps & {
  text?: string;
  loading?: boolean;
  onClick?: (event?: any) => void;
  block?: boolean;
  containerClassName?: string;
};

export const Button = forwardRef<Ref, ButtonProps>(
  (
    { text, loading, className, containerClassName, disabled, block, onClick, variant = "contained", ...props },
    ref
  ) => {
    const containerClasses = classNames(
      "alp-button__container",
      { "button--block": block },
      { [`${containerClassName}`]: !!containerClassName }
    );
    const classes = classNames(
      "alp-button",
      { "button--block": block },
      { [`button--${variant}`]: !!variant },
      { [`${className}`]: !!className }
    );

    return (
      <div className={containerClasses} data-testid="button-container">
        <MuiButton
          ref={ref}
          className={classes}
          disabled={loading || disabled}
          disableElevation
          data-testid="button"
          variant={variant}
          style={{ textTransform: "none" }}
          {...(!disabled && { onClick })}
          {...props}
        >
          {text}
        </MuiButton>
        {loading && (
          <CircularProgress size={32} color="inherit" className="alp-button--loading" data-testid="button-loading" />
        )}
      </div>
    );
  }
);
