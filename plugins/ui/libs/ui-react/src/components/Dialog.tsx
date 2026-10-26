import { useEffect, useId, useState, type ReactNode } from "react";
import MuiDialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import { Spinner } from "./Spinner";
import CloseIcon from "@mui/icons-material/Close";
import { DIALOG_SIZE_MAP, type DialogSize } from "./dialogSizes";
import { Button } from "./Button";
import "./Dialog.scss";

export interface DialogProps {
  open: boolean;
  onClose?: () => void;
  title?: string;
  size?: DialogSize;
  maxWidth?: number | string;
  closeOnEscape?: boolean;
  showClose?: boolean;
  closeLabel?: string;
  busy?: boolean;
  /**
   * Destructive / unsaved-change dialogs: an attempt to dismiss (× or Esc) opens
   * a confirm-discard dialog instead of closing. `onClose` only fires once the
   * user confirms. (Figma modal behaviour for destructive / long-form modals.)
   */
  confirmOnClose?: boolean;
  confirmTitle?: string;
  confirmMessage?: ReactNode;
  /** Label of the button that discards and closes. */
  confirmDiscardLabel?: string;
  /** Label of the button that keeps the dialog open. */
  confirmKeepLabel?: string;
  children?: ReactNode;
  actions?: ReactNode;
}

export function Dialog({
  open,
  onClose,
  title,
  size = "s",
  maxWidth,
  closeOnEscape = true,
  showClose = true,
  closeLabel = "Close dialog",
  busy = false,
  confirmOnClose = false,
  confirmTitle = "Discard changes?",
  confirmMessage = "Your unsaved changes will be lost.",
  confirmDiscardLabel = "Discard",
  confirmKeepLabel = "Keep editing",
  children,
  actions,
}: DialogProps) {
  const titleId = useId();
  const resolvedMaxWidth = maxWidth ?? DIALOG_SIZE_MAP[size];
  const [confirming, setConfirming] = useState(false);

  // When the parent dialog is closed externally, drop any pending confirm so the
  // discard dialog can't linger or carry stale state into the next open.
  useEffect(() => {
    if (!open) setConfirming(false);
  }, [open]);

  // A dismissal attempt: confirm first when requested, otherwise close outright.
  const requestClose = () => {
    if (busy) return;
    if (confirmOnClose) {
      setConfirming(true);
      return;
    }
    onClose?.();
  };

  const discard = () => {
    setConfirming(false);
    onClose?.();
  };

  return (
    <>
      <MuiDialog
        open={open}
        fullWidth
        maxWidth={false}
        disableEscapeKeyDown={busy || !closeOnEscape}
        aria-labelledby={title ? titleId : undefined}
        onClose={(_event, reason) => {
          if (reason === "backdropClick") return;
          if (!closeOnEscape) return;
          requestClose();
        }}
        slotProps={{
          backdrop: { sx: { backgroundColor: "rgba(0, 0, 0, 0.4)" } },
        }}
        PaperProps={{
          className: `d2e-dialog d2e-dialog--${size}`,
          sx: { maxWidth: resolvedMaxWidth, width: "100%" },
        }}
      >
        <header className="d2e-dialog__header">
          {title ? (
            <h2 id={titleId} className="d2e-dialog__title">
              {title}
            </h2>
          ) : null}
          {showClose ? (
            <IconButton
              className="d2e-dialog__close"
              size="small"
              aria-label={closeLabel}
              disabled={busy}
              onClick={requestClose}
            >
              <CloseIcon />
            </IconButton>
          ) : null}
        </header>

        <div className="d2e-dialog__body">
          {children}
          {busy ? (
            <div className="d2e-dialog__busy">
              <Spinner size={48} />
            </div>
          ) : null}
        </div>

        {actions ? <div className="d2e-dialog__actions">{actions}</div> : null}
      </MuiDialog>

      {confirmOnClose ? (
        <Dialog
          open={confirming}
          size="s"
          title={confirmTitle}
          onClose={() => setConfirming(false)}
          actions={
            <>
              <Button variant="secondary" onClick={() => setConfirming(false)}>
                {confirmKeepLabel}
              </Button>
              <Button variant="danger" onClick={discard}>
                {confirmDiscardLabel}
              </Button>
            </>
          }
        >
          {confirmMessage}
        </Dialog>
      ) : null}
    </>
  );
}

export default Dialog;
