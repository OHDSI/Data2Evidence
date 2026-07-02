import React, { FC, useEffect, useRef, useState } from "react";
import classNames from "classnames";
import { CloseIcon } from "../Icons";
import { AlertErrorIcon, AlertWarningIcon, AlertSuccessIcon, AlertInfoIcon } from "./AlertIcons";
import "./Alert.scss";

export type AlertSeverity = "error" | "warning" | "success" | "info";
export type AlertVariant = "banner" | "toast";

const TOAST_EXIT_MS = 200;

export interface AlertProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Visual tone and icon: `error`, `warning`, `success`, or `info`. Defaults to `info`. */
  severity?: AlertSeverity;
  /** Layout mode: `banner` renders inline in the page, `toast` floats and can auto-dismiss. Defaults to `banner`. */
  variant?: AlertVariant;
  /** Banner only: `true` renders rounded/contained corners, `false` renders full-bleed square edges. */
  inline?: boolean;
  /** Bold heading line shown above the message. Omit for a single-line alert. */
  title?: React.ReactNode;
  /** Body text of the alert. Omit for a title-only alert. */
  message?: React.ReactNode;
  /** Optional trailing action link. */
  actionLabel?: string;
  /** Handler for the action link; the link only renders when both this and `actionLabel` are set. */
  onAction?: () => void;
  /** Show a close button. On a toast this also disables auto-dismiss. */
  dismissible?: boolean;
  /** Toast only: auto-dismiss delay in ms, used when not `dismissible`. */
  autoHideDuration?: number;
  /** Called when the toast should disappear — on close-button click or auto-dismiss timer. */
  onClose?: () => void;
  /** Toast only: controlled visibility. Banner ignores this. */
  visible?: boolean;
  /** Extra CSS class names appended to the root element. */
  className?: string;
}

const SEVERITY_ICONS: Record<AlertSeverity, FC<React.SVGProps<SVGSVGElement>>> = {
  error: AlertErrorIcon,
  warning: AlertWarningIcon,
  success: AlertSuccessIcon,
  info: AlertInfoIcon,
};

// Fires `onClose` once after `delay` ms while `active`. The callback is read from a
// ref so a new inline `onClose` identity doesn't restart the timer on re-render.
function useAutoDismiss(active: boolean, delay: number, onClose?: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!active) return undefined;
    const timer = setTimeout(() => onCloseRef.current?.(), delay);
    return () => clearTimeout(timer);
  }, [active, delay]);
}

export const Alert: FC<AlertProps> = ({
  severity = "info",
  variant = "banner",
  inline = false,
  title,
  message,
  actionLabel,
  onAction,
  dismissible = false,
  autoHideDuration = 5000,
  onClose,
  visible = true,
  className,
  ...props
}) => {
  const isToast = variant === "toast";

  const [mounted, setMounted] = useState(visible);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!isToast) return undefined;
    if (visible) {
      setLeaving(false);
      setMounted(true);
      return undefined;
    }
    if (!mounted) return undefined;
    setLeaving(true);
    const timer = setTimeout(() => setMounted(false), TOAST_EXIT_MS);
    return () => clearTimeout(timer);
  }, [visible, isToast, mounted]);

  // A non-dismissible toast auto-closes after `autoHideDuration`; a dismissible one
  // stays until the user clicks its close button.
  useAutoDismiss(isToast && !dismissible && visible, autoHideDuration, onClose);

  // Toast is controlled via `visible`; banner always renders.
  if (isToast && !mounted) return null;

  const Icon = SEVERITY_ICONS[severity];

  const classes = classNames(
    "alp-alert",
    `alp-alert--${severity}`,
    `alp-alert--${variant}`,
    { "alp-alert--leaving": isToast && leaving },
    { "alp-alert--inline": variant === "banner" && inline },
    { "alp-alert--multiline": !!title && !!message },
    { [`${className}`]: !!className }
  );

  return (
    <div className={classes} role="alert" data-testid="alert" {...props}>
      <span className="alp-alert__icon" aria-hidden="true">
        <Icon />
      </span>
      <div className="alp-alert__content">
        {title && (
          <div className="alp-alert__title" data-testid="alert-title">
            {title}
          </div>
        )}
        {message && (
          <div className="alp-alert__message" data-testid="alert-message">
            {message}
          </div>
        )}
      </div>
      {actionLabel && typeof onAction === "function" && (
        <button type="button" className="alp-alert__action" onClick={onAction} data-testid="alert-action">
          {actionLabel}
        </button>
      )}
      {dismissible && (
        <button
          type="button"
          className="alp-alert__close"
          onClick={onClose}
          aria-label="Close"
          data-testid="alert-close"
        >
          <CloseIcon />
        </button>
      )}
    </div>
  );
};
