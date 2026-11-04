import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import MuiIconButton from "@mui/material/IconButton";
import clsx from "clsx";
import { ICON_BUTTON_SIZE_MAP } from "./iconButtonSizes";
import type {
  IconButtonSize,
  IconButtonCategory,
} from "./iconButtonSizes";
import { resolveIcon, type Icon } from "./internal/icon";
import "./IconButton.scss";

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "color"> {
  category?: IconButtonCategory;
  size?: IconButtonSize;
  icon?: Icon;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  children?: ReactNode;
}

// forwardRef + ...rest so MUI Tooltip/Menu wrappers can anchor and inject handlers.
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      category = "no-stroke",
      size = "md",
      icon,
      ariaLabel,
      disabled = false,
      className,
      style,
      onClick,
      children,
      ...rest
    },
    ref,
  ) {
    const spec = ICON_BUTTON_SIZE_MAP[size];

    return (
      <MuiIconButton
        ref={ref}
        {...rest}
        className={clsx(
          "d2e-icon-button",
          `d2e-icon-button--${category}`,
          `d2e-icon-button--${size}`,
          className,
        )}
        style={{ width: `${spec.container}px`, height: `${spec.container}px`, ...style }}
        aria-label={ariaLabel}
        disabled={disabled}
        focusRipple
        onClick={onClick}
      >
        {children ?? resolveIcon(icon, { fontSize: spec.icon })}
      </MuiIconButton>
    );
  },
);

export default IconButton;
