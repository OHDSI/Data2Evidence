import type { ReactNode } from "react";
import Snackbar, { type SnackbarOrigin } from "@mui/material/Snackbar";
import { Alert, type AlertSeverity } from "./Alert";

export interface AlertToastProps {
  open: boolean;
  onClose: () => void;
  severity?: AlertSeverity;
  title?: ReactNode;
  action?: ReactNode;
  /**
   * Show the × close button. When true the toast is dismissible only by the user;
   * when false it auto-dismisses (Figma: 5s). Default true.
   */
  closeButton?: boolean;
  /** Overrides the auto-dismiss delay used when there is no close button. */
  autoHideDuration?: number;
  closeLabel?: string;
  anchorOrigin?: SnackbarOrigin;
  className?: string;
  children?: ReactNode;
}

// Floating toast (Figma "Alert toast"): a 380px alert anchored top-right. With a
// close button it stays until dismissed; without one it auto-hides after 5s.
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
      autoHideDuration={closeButton ? null : autoHideDuration}
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
