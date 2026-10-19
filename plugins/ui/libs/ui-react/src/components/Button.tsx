import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import MuiButton from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import clsx from "clsx";
import { VARIANT_MAP, SIZE_MAP } from "./buttonVariants";
import type { ButtonVariant, ButtonSize } from "./buttonVariants";
import { resolveIcon, type Icon } from "./internal/icon";
import "./Button.scss";

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "color" | "type"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  block?: boolean;
  prependIcon?: Icon;
  appendIcon?: Icon;
  type?: "button" | "submit" | "reset";
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  children?: ReactNode;
}

// forwardRef so wrappers that need the DOM node (MUI Tooltip anchor, Menu
// activator, transitions) can reach it; ...rest carries the handlers/aria those
// wrappers inject onto their child.
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled = false,
      block = false,
      prependIcon,
      appendIcon,
      type = "button",
      className,
      style,
      onClick,
      children,
      ...rest
    },
    ref,
  ) {
    const spec = SIZE_MAP[size];

    return (
      <MuiButton
        ref={ref}
        {...rest}
        type={type}
        className={clsx(
          "d2e-button",
          `d2e-button--${variant}`,
          `d2e-button--${size}`,
          loading && "d2e-button--loading",
          className,
        )}
        variant={VARIANT_MAP[variant].muiVariant}
        color="primary"
        disabled={disabled || loading}
        fullWidth={block}
        disableElevation
        focusRipple
        style={{
          height: `${spec.height}px`,
          minWidth: `${spec.minWidth}px`,
          fontSize: `${spec.font}px`,
          ...style,
        }}
        startIcon={loading ? undefined : resolveIcon(prependIcon, { fontSize: spec.icon })}
        endIcon={loading ? undefined : resolveIcon(appendIcon, { fontSize: spec.icon })}
        onClick={onClick}
      >
        {children}
        {loading ? (
          <span className="d2e-button__spinner">
            <CircularProgress size={spec.icon} color="inherit" />
          </span>
        ) : null}
      </MuiButton>
    );
  },
);

export default Button;
