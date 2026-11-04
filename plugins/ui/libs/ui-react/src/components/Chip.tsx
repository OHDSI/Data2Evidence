import type { ReactNode } from "react";
import CloseIcon from "@mui/icons-material/Close";
import clsx from "clsx";
import { CHIP_VARIANT_MAP, type ChipVariant } from "./chipVariants";
import { resolveIcon, type Icon } from "./internal/icon";
import "./Chip.scss";

export interface ChipProps {
  variant?: ChipVariant;
  label?: string;
  /** Leading glyph slot — supplied by the caller. Pass `false` to omit. */
  icon?: Icon;
  /** Shows a trailing × that calls this handler (dismissible filter chip). */
  onDismiss?: () => void;
  dismissLabel?: string;
  children?: ReactNode;
  className?: string;
}

export function Chip({
  variant = "positive",
  label,
  icon,
  onDismiss,
  dismissLabel = "Remove",
  children,
  className,
}: ChipProps) {
  const { background, color } = CHIP_VARIANT_MAP[variant];
  const leadingIcon = resolveIcon(icon, { fontSize: 16 });

  return (
    <span
      className={clsx("d2e-chip", className)}
      style={{ background, color }}
    >
      {leadingIcon}
      <span className="d2e-chip__label">{children ?? label}</span>
      {onDismiss ? (
        <button
          type="button"
          className="d2e-chip__dismiss"
          aria-label={dismissLabel}
          onClick={onDismiss}
        >
          <CloseIcon />
        </button>
      ) : null}
    </span>
  );
}

export default Chip;
