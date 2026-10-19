import type { ReactNode } from "react";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ScheduleIcon from "@mui/icons-material/Schedule";
import LockIcon from "@mui/icons-material/Lock";
import CloseIcon from "@mui/icons-material/Close";
import { STATUS_CHIP_VARIANT_MAP } from "./statusChipVariants";
import type { StatusChipVariant } from "./statusChipVariants";
import { resolveIcon, type Icon } from "./internal/icon";
import "./StatusChip.scss";

// Figma bakes a leading glyph into each variant; the consumer can override with
// `icon` or suppress it with `icon={false}`.
const DEFAULT_ICON: Record<StatusChipVariant, ReactNode> = {
  positive: <CheckCircleOutlineIcon />,
  warning: <ScheduleIcon />,
  negative: <LockIcon />,
  neutral: <LockIcon />,
  multiselect: null,
  "have-access": <CheckCircleOutlineIcon />,
  "pending-access": <ScheduleIcon />,
  locked: <LockIcon />,
};

export interface StatusChipProps {
  variant?: StatusChipVariant;
  label?: string;
  icon?: Icon;
  /** Shows a trailing × that calls this handler (dismissible filter chip). */
  onDismiss?: () => void;
  dismissLabel?: string;
  children?: ReactNode;
}

export function StatusChip({
  variant = "positive",
  label,
  icon,
  onDismiss,
  dismissLabel = "Remove",
  children,
}: StatusChipProps) {
  const resolved = STATUS_CHIP_VARIANT_MAP[variant];
  const leadingIcon =
    icon !== undefined ? resolveIcon(icon, { fontSize: 16 }) : DEFAULT_ICON[variant];

  return (
    <span
      className="d2e-status-chip"
      style={{ background: resolved.background, color: resolved.color }}
    >
      {leadingIcon}
      <span className="d2e-status-chip__label">{children ?? label}</span>
      {onDismiss ? (
        <button
          type="button"
          className="d2e-status-chip__dismiss"
          aria-label={dismissLabel}
          onClick={onDismiss}
        >
          <CloseIcon />
        </button>
      ) : null}
    </span>
  );
}

export default StatusChip;
