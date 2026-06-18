import React, { FC } from "react";
import { default as MuiDialog, DialogProps as MuiDialogProps } from "@mui/material/Dialog";
import MuiIconButton from "@mui/material/IconButton";
import MuiDivider from "@mui/material/Divider";
import MuiCircularProgress from "@mui/material/CircularProgress";
import classNames from "classnames";
import { Alert } from "../Alert/Alert";
import { Feedback } from "../../types";
import { CloseIcon } from "../Icons";
import "./Dialog.scss";

/** Width tier. When set it takes precedence over MUI's `maxWidth`. */
export type DialogSize = "small" | "medium" | "large" | "xlarge";

export interface DialogFooterSlots {
  /** Left-aligned text-link action (e.g. "Action", "Learn more"). */
  actionLabel?: string;
  /** Handler for the left-aligned action link; the link only renders when `actionLabel` is set. */
  onAction?: () => void;
  /** Right cluster — typically a Cancel button. */
  secondary?: React.ReactNode;
  /** Right cluster — the primary/confirm/next button. Disabled automatically while `loading`. */
  primary?: React.ReactNode;
  /** Full-width layout: buttons fill the footer and share the width. Default is right-aligned, natural-width. */
  block?: boolean;
}

export interface DialogProps extends MuiDialogProps {
  // --- Visibility & close behavior ---
  /** Whether the dialog is visible. Required (controlled). */
  open: boolean;
  /** Called to close the dialog on X/Esc. When `confirmOnClose` is set, `onRequestDiscard` runs instead. */
  onClose?: () => void;
  /** When `true`, X/Esc route through `onRequestDiscard` (for a confirm-discard prompt) instead of
   * closing directly. Has no effect unless `onRequestDiscard` is set. */
  confirmOnClose?: boolean;
  /** Fires on X/Esc when `confirmOnClose` is set (instead of `onClose`), so you can show a
   * confirm-discard UI. If absent, `confirmOnClose` is ignored and X/Esc close directly. */
  onRequestDiscard?: () => void;

  // --- Header ---
  /** Heading text shown in the dialog header. Omit to render a dialog with no title bar. */
  title?: string;
  /** Render an X close button in the header. */
  closable?: boolean;
  /** Optional paragraph line rendered under the title. */
  description?: React.ReactNode;

  // --- Feedback banner (below the title) ---
  /** Inline banner shown below the title (e.g. post-action success/error). Rendered via `Alert`. */
  feedback?: Feedback;
  /** Dismiss handler for the `feedback` banner; when set, the banner shows a close button. */
  onCloseFeedback?: () => void;

  // --- Body & sizing ---
  /** Size tier → width. When set, overrides `maxWidth`/`fullWidth`. */
  size?: DialogSize;
  /** Apply the standard body inset. Off by default so consumers that pad their own content aren't double-padded. */
  bodyPadded?: boolean;
  /** Action-in-progress: shows a spinner overlay and disables the footer primary; keeps the modal open. */
  loading?: boolean;

  // --- Footer ---
  /** Optional footer area (e.g. action buttons); rendered at the bottom with a divider above it. */
  footer?: React.ReactNode;
  /** Structured footer. The freeform `footer` prop still works and wins if both are passed. */
  footerSlots?: DialogFooterSlots;
}

export const Dialog: FC<DialogProps> = ({
  // Visibility & close behavior
  open,
  onClose,
  confirmOnClose = false,
  onRequestDiscard,
  // Header
  title,
  closable,
  description,
  // Feedback banner
  feedback,
  onCloseFeedback,
  // Body & sizing
  size,
  bodyPadded,
  loading,
  // Footer
  footer,
  footerSlots,
  // MUI passthrough
  maxWidth,
  fullWidth,
  className,
  children,
  ...props
}) => {
  const classes = classNames("alp-dialog", { [`${className}`]: !!className });

  // When guarded, X & Esc route through the discard confirm; otherwise they close directly.
  const needsDiscardConfirm = confirmOnClose && typeof onRequestDiscard === "function";
  const handleCloseRequest = () => (needsDiscardConfirm ? onRequestDiscard!() : onClose?.());

  const handleMuiClose = (_event: object, reason: "backdropClick" | "escapeKeyDown") => {
    if (reason === "backdropClick") return; // overlay click never dismisses
    if (reason === "escapeKeyDown") handleCloseRequest();
  };

  const hasFooter = !!footer || !!footerSlots;
  const primaryNode =
    footerSlots?.primary && loading && React.isValidElement(footerSlots.primary)
      ? React.cloneElement(footerSlots.primary as React.ReactElement, { disabled: true })
      : footerSlots?.primary;

  return (
    <MuiDialog
      open={open}
      className={classes}
      fullWidth={size ? false : fullWidth ?? true}
      maxWidth={size ? false : maxWidth ?? "sm"}
      onClose={handleMuiClose}
      PaperProps={{
        className: classNames("alp-dialog__paper", { [`alp-dialog__paper--${size}`]: !!size }),
        style: {
          borderRadius: 16,
          overflow: "hidden", // body handles its own scroll so header/footer stay fixed
          // Positioned only while loading (overlay anchor); unpositioned avoids a blank-space quirk.
          position: loading ? "relative" : "unset",
        },
      }}
      data-testid="dialog"
      {...props}
    >
      {title && (
        <div className="alp-dialog__title">
          <div className="alp-dialog__title-text" data-testid="dialog-title">
            {title}
          </div>
          {closable && (
            <MuiIconButton
              className="alp-dialog__close"
              onClick={handleCloseRequest}
              aria-label="close"
              data-testid="dialog-close"
            >
              <CloseIcon />
            </MuiIconButton>
          )}
        </div>
      )}
      {description && (
        <div className="alp-dialog__description" data-testid="dialog-description">
          {description}
        </div>
      )}
      {feedback && (feedback.message || feedback.description) && (
        <Alert
          variant="banner"
          severity={feedback.type ?? "info"}
          title={feedback.message}
          message={feedback.description}
          actionLabel={feedback.actionLabel}
          onAction={feedback.onAction}
          dismissible={typeof onCloseFeedback === "function"}
          onClose={onCloseFeedback}
        />
      )}
      <div className={classNames("alp-dialog__body", { "alp-dialog__body--padded": bodyPadded })}>{children}</div>
      {hasFooter && (
        <div className="alp-dialog__footer">
          <MuiDivider data-testid="dialog-footer-divider" />
          {footer ? (
            footer
          ) : (
            <div
              className={classNames("alp-dialog__footer-bar", {
                "alp-dialog__footer--block": footerSlots?.block,
              })}
            >
              {footerSlots?.actionLabel && (
                <button
                  type="button"
                  className="alp-dialog__footer-action"
                  onClick={footerSlots.onAction}
                  data-testid="dialog-footer-action"
                >
                  {footerSlots.actionLabel}
                </button>
              )}
              <div className="alp-dialog__footer-buttons">
                {footerSlots?.secondary}
                {primaryNode}
              </div>
            </div>
          )}
        </div>
      )}
      {loading && (
        <div className="alp-dialog__loading-overlay" data-testid="dialog-loading">
          <MuiCircularProgress color="inherit" />
        </div>
      )}
    </MuiDialog>
  );
};
