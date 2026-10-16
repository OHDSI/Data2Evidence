import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import clsx from "clsx";
import { VARIANT_MAP, SIZE_MAP } from "./buttonVariants";
import type { D2eButtonVariant, D2eButtonSize } from "./buttonVariants";
import { resolveIcon, type D2eIcon } from "./internal/icon";
import "./D2eButton.scss";

export interface D2eButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "color" | "type"> {
  variant?: D2eButtonVariant;
  size?: D2eButtonSize;
  loading?: boolean;
  disabled?: boolean;
  block?: boolean;
  prependIcon?: D2eIcon;
  appendIcon?: D2eIcon;
  type?: "button" | "submit" | "reset";
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  children?: ReactNode;
}

// forwardRef so wrappers that need the DOM node (MUI Tooltip anchor, Menu
// activator, transitions) can reach it; ...rest carries the handlers/aria those
// wrappers inject onto their child.
export const D2eButton = forwardRef<HTMLButtonElement, D2eButtonProps>(
  function D2eButton(
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
      onClick,
      children,
      ...rest
    },
    ref,
  ) {
    const spec = SIZE_MAP[size];

    return (
      <Button
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
      </Button>
    );
  },
);

export default D2eButton;
