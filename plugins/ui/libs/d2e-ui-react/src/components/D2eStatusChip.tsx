import type { ReactNode } from "react";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ScheduleIcon from "@mui/icons-material/Schedule";
import LockIcon from "@mui/icons-material/Lock";
import CloseIcon from "@mui/icons-material/Close";
import { STATUS_CHIP_VARIANT_MAP } from "./statusChipVariants";
import type { D2eStatusChipVariant } from "./statusChipVariants";
import { resolveIcon, type D2eIcon } from "./internal/icon";
import "./D2eStatusChip.scss";

// Figma bakes a leading glyph into each variant; the consumer can override with
// `icon` or suppress it with `icon={false}`.
const DEFAULT_ICON: Record<D2eStatusChipVariant, ReactNode> = {
  positive: <CheckCircleOutlineIcon />,
  warning: <ScheduleIcon />,
  negative: <LockIcon />,
  neutral: <LockIcon />,
  multiselect: null,
  "have-access": <CheckCircleOutlineIcon />,
  "pending-access": <ScheduleIcon />,
  locked: <LockIcon />,
};

export interface D2eStatusChipProps {
  variant?: D2eStatusChipVariant;
  label?: string;
  icon?: D2eIcon;
  /** Shows a trailing × that calls this handler (dismissible filter chip). */
  onDismiss?: () => void;
  dismissLabel?: string;
  children?: ReactNode;
}

export function D2eStatusChip({
  variant = "positive",
  label,
  icon,
  onDismiss,
  dismissLabel = "Remove",
  children,
}: D2eStatusChipProps) {
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

export default D2eStatusChip;
