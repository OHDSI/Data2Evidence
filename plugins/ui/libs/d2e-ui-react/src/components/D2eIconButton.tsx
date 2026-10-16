import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import IconButton from "@mui/material/IconButton";
import clsx from "clsx";
import { ICON_BUTTON_SIZE_MAP } from "./iconButtonSizes";
import type {
  D2eIconButtonSize,
  D2eIconButtonCategory,
} from "./iconButtonSizes";
import { resolveIcon, type D2eIcon } from "./internal/icon";
import "./D2eIconButton.scss";

export interface D2eIconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "color"> {
  category?: D2eIconButtonCategory;
  size?: D2eIconButtonSize;
  icon?: D2eIcon;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  children?: ReactNode;
}

// forwardRef + ...rest so MUI Tooltip/Menu wrappers can anchor and inject handlers.
export const D2eIconButton = forwardRef<HTMLButtonElement, D2eIconButtonProps>(
  function D2eIconButton(
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
      <IconButton
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
      </IconButton>
    );
  },
);

export default D2eIconButton;
