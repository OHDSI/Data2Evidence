import React, { FC, MouseEventHandler } from "react";
import "./Snackbar.scss";

type SnackbarProps = React.HTMLAttributes<HTMLDivElement> & {
  type?: "error" | "success";
  message?: string | string[];
  description?: string;
  handleClose?: MouseEventHandler;
  visible: boolean;
};

export const Snackbar: FC<SnackbarProps> = ({ message, description, type, visible = false, handleClose }) => {
  if (!visible) return null;

  return (
    <d4l-snack-bar type={type} data-testid="snackbar">
      <div slot="snack-bar-icon">
        {type === "success" && <d4l-icon-check classes="icon icon--small" />}
        {type === "error" && <d4l-icon-info classes="icon icon--small" />}
      </div>
      <div slot="snack-bar-content">
        <div className="snack-bar-msg">
          <div data-testid="snackbar-message">
            {Array.isArray(message) ? (
              <>
                {message.map((m) => (
                  <>
                    {m}
                    <br />
                  </>
                ))}
              </>
            ) : (
              message
            )}
          </div>
          {description && <div>{description}</div>}
        </div>
      </div>
      <div slot="snack-bar-controls">
        {typeof handleClose === "function" && (
          <d4l-button classes="button--text button--uppercase" onClick={handleClose} data-testid="snackbar-close">
            <d4l-icon-close classes="icon icon--small" />
          </d4l-button>
        )}
      </div>
    </d4l-snack-bar>
  );
};
