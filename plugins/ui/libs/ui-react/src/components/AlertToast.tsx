import type { ReactNode } from "react";
import Snackbar, { type SnackbarOrigin } from "@mui/material/Snackbar";
import { Alert, type AlertSeverity } from "./Alert";

export interface AlertToastProps {
  open: boolean;
  onClose: () => void;
  severity?: AlertSeverity;
  title?: ReactNode;
  action?: ReactNode;
  /** Show the × close button so the viewer can dismiss early. Default true. */
  closeButton?: boolean;
  /**
   * Auto-dismiss delay in ms (Figma: 5s), independent of `closeButton`. Pass
   * `null` to keep the toast until the viewer dismisses it. Default 5000.
   */
  autoHideDuration?: number | null;
  closeLabel?: string;
  anchorOrigin?: SnackbarOrigin;
  className?: string;
  children?: ReactNode;
}

// Floating toast (Figma "Alert toast"): a 380px alert anchored top-right. Shows
// a × when closeButton is set and auto-hides after autoHideDuration (null keeps
// it until dismissed); the two are independent.
export function AlertToast({
  open,
  onClose,
  severity = "info",
  title,
  action,
  closeButton = true,
  autoHideDuration = 5000,
  closeLabel,
  anchorOrigin = { vertical: "top", horizontal: "right" },
  className,
  children,
}: AlertToastProps) {
  return (
    <Snackbar
      open={open}
      anchorOrigin={anchorOrigin}
      autoHideDuration={autoHideDuration}
      onClose={(_event, reason) => {
        if (reason === "clickaway") return;
        onClose();
      }}
    >
      <Alert
        severity={severity}
        variant="inline"
        title={title}
        action={action}
        onClose={closeButton ? onClose : undefined}
        closeLabel={closeLabel}
        className={className ? `d2e-alert--toast ${className}` : "d2e-alert--toast"}
      >
        {children}
      </Alert>
    </Snackbar>
  );
}

export default AlertToast;
