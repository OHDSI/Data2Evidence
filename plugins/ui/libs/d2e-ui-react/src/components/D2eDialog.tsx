import { useId, useState, type ReactNode } from "react";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import CloseIcon from "@mui/icons-material/Close";
import { DIALOG_SIZE_MAP, type D2eDialogSize } from "./dialogSizes";
import { D2eButton } from "./D2eButton";
import "./D2eDialog.scss";

export interface D2eDialogProps {
  open: boolean;
  onClose?: () => void;
  title?: string;
  size?: D2eDialogSize;
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

export function D2eDialog({
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
}: D2eDialogProps) {
  const titleId = useId();
  const resolvedMaxWidth = maxWidth ?? DIALOG_SIZE_MAP[size];
  const [confirming, setConfirming] = useState(false);

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
      <Dialog
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
              <CircularProgress color="primary" aria-label="Loading" />
            </div>
          ) : null}
        </div>

        {actions ? <div className="d2e-dialog__actions">{actions}</div> : null}
      </Dialog>

      {confirmOnClose ? (
        <D2eDialog
          open={confirming}
          size="s"
          title={confirmTitle}
          onClose={() => setConfirming(false)}
          actions={
            <>
              <D2eButton variant="secondary" onClick={() => setConfirming(false)}>
                {confirmKeepLabel}
              </D2eButton>
              <D2eButton variant="danger" onClick={discard}>
                {confirmDiscardLabel}
              </D2eButton>
            </>
          }
        >
          {confirmMessage}
        </D2eDialog>
      ) : null}
    </>
  );
}

export default D2eDialog;
