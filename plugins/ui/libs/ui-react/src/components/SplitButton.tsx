import type { MouseEvent, ReactNode } from "react";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import clsx from "clsx";
import { Button } from "./Button";
import { SIZE_MAP, type ButtonSize } from "./buttonVariants";
import type { Icon } from "./internal/icon";
import "./SplitButton.scss";

export type SplitButtonVariant = "primary" | "secondary";

export interface SplitButtonProps {
  /** The main button's label. */
  children?: ReactNode;
  variant?: SplitButtonVariant;
  size?: ButtonSize;
  /** Icon before the label (Figma: Icon front). */
  prependIcon?: Icon;
  /** Icon after the label (Figma: Icon back). */
  appendIcon?: Icon;
  disabled?: boolean;
  /** Shows a spinner on the main button. */
  loading?: boolean;
  /** Controls the chevron direction (▾ closed / ▴ open). */
  open?: boolean;
  /** Primary action — the main (left) segment. */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  /** Dropdown toggle — the chevron (right) segment, e.g. open a Menu. */
  onToggle?: (event: MouseEvent<HTMLButtonElement>) => void;
  /** Accessible name for the chevron segment. */
  menuLabel?: string;
  className?: string;
}

// Button + 1px divider + square chevron segment (Figma "Split button"). The main
// segment fires onClick; the chevron fires onToggle (e.g. to open a Menu). Both
// segments reuse <Button>, so variant/size/state styling stays in one place.
export function SplitButton({
  children,
  variant = "primary",
  size = "md",
  prependIcon,
  appendIcon,
  disabled = false,
  loading = false,
  open = false,
  onClick,
  onToggle,
  menuLabel = "More actions",
  className,
}: SplitButtonProps) {
  const square = SIZE_MAP[size].height;
  const chevronSize = SIZE_MAP[size].icon;
  const ChevronIcon = open ? ExpandLessIcon : ExpandMoreIcon;

  return (
    <div
      role="group"
      className={clsx("d2e-split-button", `d2e-split-button--${variant}`, className)}
    >
      <Button
        className="d2e-split-button__main"
        variant={variant}
        size={size}
        prependIcon={prependIcon}
        appendIcon={appendIcon}
        disabled={disabled}
        loading={loading}
        onClick={onClick}
      >
        {children}
      </Button>
      <span className="d2e-split-button__divider" aria-hidden="true" />
      <Button
        className="d2e-split-button__toggle"
        variant={variant}
        size={size}
        disabled={disabled}
        aria-label={menuLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={onToggle}
        style={{ minWidth: square, width: square, paddingInline: 0 }}
      >
        <ChevronIcon sx={{ fontSize: chevronSize }} />
      </Button>
    </div>
  );
}

export default SplitButton;
