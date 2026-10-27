import { useRef, useState, type ReactNode } from "react";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import clsx from "clsx";
import { Button } from "./Button";
import "./FileUpload.scss";

export type FileUploadDensity = "default" | "compact";

export interface FileUploadProps {
  density?: FileUploadDensity;
  /** Accept attribute for the hidden input, e.g. "application/json". */
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  /** Hint under the heading, e.g. "json (max. 3 MB)". */
  hint?: string;
  heading?: string;
  /** Heading shown while dragging over the zone. */
  draggingHeading?: string;
  browseLabel?: string;
  onFilesSelected?: (files: File[]) => void;
  /** File list rendered below the zone (FileUploadItem rows). */
  children?: ReactNode;
  className?: string;
}

export function FileUpload({
  density = "default",
  accept,
  multiple = false,
  disabled = false,
  hint = "json (max. 3 MB)",
  heading = "Drag and drop files here",
  draggingHeading = "Drop files here",
  browseLabel = "Browse files",
  onFilesSelected,
  children,
  className,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const emit = (fileList: FileList | null) => {
    if (!fileList || !fileList.length) return;
    // Dropped files bypass the input's `multiple` restriction, so enforce the
    // single-file limit here too — one shared rule for drop and browse.
    const files = Array.from(fileList);
    onFilesSelected?.(multiple ? files : files.slice(0, 1));
  };

  const openBrowse = () => {
    if (!disabled) inputRef.current?.click();
  };

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    emit(event.dataTransfer.files);
  };

  const onDragOver = (event: React.DragEvent) => {
    if (disabled) return;
    event.preventDefault();
    setDragging(true);
  };

  const compact = density === "compact";

  return (
    <div className={className}>
      <div
        className={clsx("d2e-file-upload", `d2e-file-upload--${density}`, {
          "d2e-file-upload--dragging": dragging,
          "d2e-file-upload--disabled": disabled,
        })}
        role={compact ? undefined : "button"}
        tabIndex={!compact && !disabled ? 0 : undefined}
        aria-disabled={disabled || undefined}
        onClick={compact ? undefined : openBrowse}
        onKeyDown={
          compact
            ? undefined
            : (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openBrowse();
                }
              }
        }
        onDragOver={onDragOver}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          className="d2e-file-upload__input"
          onChange={(event) => {
            emit(event.target.files);
            // Reset so selecting the same file again still fires onChange.
            event.target.value = "";
          }}
        />

        <CloudUploadOutlinedIcon className="d2e-file-upload__icon" />

        {compact ? (
          <div className="d2e-file-upload__compact-text">
            <p className="d2e-file-upload__heading">
              {dragging ? (
                draggingHeading
              ) : (
                <>
                  <button
                    type="button"
                    className="d2e-file-upload__browse-link"
                    disabled={disabled}
                    onClick={(event) => {
                      event.stopPropagation();
                      openBrowse();
                    }}
                  >
                    {browseLabel}
                  </button>{" "}
                  or drag and drop
                </>
              )}
            </p>
            <span className="d2e-file-upload__hint">{hint}</span>
          </div>
        ) : (
          <>
            <p className="d2e-file-upload__heading">
              {dragging ? draggingHeading : heading}
            </p>
            <span className="d2e-file-upload__hint">{hint}</span>
            <div className="d2e-file-upload__divider">
              <span>or</span>
            </div>
            <Button
              variant={dragging ? "primary" : "secondary"}
              disabled={disabled}
              onClick={(event) => {
                event.stopPropagation();
                openBrowse();
              }}
            >
              {browseLabel}
            </Button>
          </>
        )}
      </div>

      {children ? <div className="d2e-file-upload__list">{children}</div> : null}
    </div>
  );
}

export default FileUpload;
