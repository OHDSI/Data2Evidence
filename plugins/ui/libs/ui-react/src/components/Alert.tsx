import { forwardRef } from "react";
import type { ComponentType, HTMLAttributes, ReactNode } from "react";
import type { SvgIconProps } from "@mui/material/SvgIcon";
import IconButton from "@mui/material/IconButton";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CloseIcon from "@mui/icons-material/Close";
import clsx from "clsx";
import "./Alert.scss";

export type AlertSeverity = "error" | "warning" | "success" | "info";
export type AlertVariant = "inline" | "banner";

const SEVERITY_ICON: Record<AlertSeverity, ComponentType<SvgIconProps>> = {
  error: ErrorOutlineIcon,
  warning: WarningAmberOutlinedIcon,
  success: CheckCircleOutlineIcon,
  info: InfoOutlinedIcon,
};

export interface AlertProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  severity?: AlertSeverity;
  /** inline = rounded with 16px inset; banner = square, full-width, 24px inset. */
  variant?: AlertVariant;
  title?: ReactNode;
  /** Trailing action slot, e.g. a ghost Button. */
  action?: ReactNode;
  /** Renders a trailing × that calls this handler. */
  onClose?: () => void;
  closeLabel?: string;
  children?: ReactNode;
}

// forwardRef is required: MUI's Snackbar/Grow transition clones its child with a
// ref and reads node.scrollTop; a non-forwarding child crashes with a null read.
export const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(
  {
    severity = "info",
    variant = "inline",
    title,
    action,
    onClose,
    closeLabel = "Close",
    className,
    children,
    ...rest
  },
  ref,
) {
  const Icon = SEVERITY_ICON[severity];

  return (
    <div
      ref={ref}
      {...rest}
      role="alert"
      className={clsx(
        "d2e-alert",
        `d2e-alert--${severity}`,
        `d2e-alert--${variant}`,
        className,
      )}
    >
      <span className="d2e-alert__icon">
        <Icon />
      </span>
      <div className="d2e-alert__text">
        {title ? <div className="d2e-alert__title">{title}</div> : null}
        <div className="d2e-alert__message">{children}</div>
      </div>
      {action ? <div className="d2e-alert__action">{action}</div> : null}
      {onClose ? (
        <div className="d2e-alert__close">
          <IconButton size="small" aria-label={closeLabel} onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </div>
      ) : null}
    </div>
  );
});

export default Alert;
