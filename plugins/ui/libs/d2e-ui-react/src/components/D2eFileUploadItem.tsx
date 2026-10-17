import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import clsx from "clsx";
import "./D2eFileUploadItem.scss";

export type D2eFileUploadStatus = "default" | "uploading" | "complete" | "error";

export interface D2eFileUploadItemProps {
  name: string;
  /** Pre-formatted, e.g. "100 kB". */
  size?: string;
  status?: D2eFileUploadStatus;
  /** Trailing status text after the size, e.g. "Uploading 45%", "Complete". */
  statusText?: string;
  /** Error description shown in place of size/status, e.g. "File too large (max. 3 MB)". */
  errorText?: string;
  onRemove?: () => void;
  onDelete?: () => void;
  className?: string;
}

export function D2eFileUploadItem({
  name,
  size,
  status = "default",
  statusText,
  errorText,
  onRemove,
  onDelete,
  className,
}: D2eFileUploadItemProps) {
  const isError = status === "error";

  const meta =
    isError && errorText
      ? `${errorText}${statusText ? ` · ${statusText}` : ""}`
      : [size, statusText].filter(Boolean).join(" · ");

  return (
    <div
      className={clsx(
        "d2e-file-item",
        `d2e-file-item--${status}`,
        className,
      )}
    >
      <InsertDriveFileOutlinedIcon className="d2e-file-item__icon" />
      <div className="d2e-file-item__body">
        <span className="d2e-file-item__name">{name}</span>
        {meta ? <span className="d2e-file-item__meta">{meta}</span> : null}
      </div>
      <div className="d2e-file-item__actions">
        {status === "uploading" ? (
          <CircularProgress size={20} className="d2e-file-item__spinner" />
        ) : null}
        {status === "complete" ? (
          <CheckCircleIcon className="d2e-file-item__check" />
        ) : null}
        {(status === "complete" || status === "error") && onDelete ? (
          <IconButton size="small" aria-label="Delete file" onClick={onDelete}>
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        ) : null}
        {(status === "default" || status === "uploading") && onRemove ? (
          <IconButton size="small" aria-label="Remove file" onClick={onRemove}>
            <CloseIcon fontSize="small" />
          </IconButton>
        ) : null}
      </div>
    </div>
  );
}

export default D2eFileUploadItem;
