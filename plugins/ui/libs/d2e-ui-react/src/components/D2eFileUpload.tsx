import { useRef, useState, type ReactNode } from "react";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import clsx from "clsx";
import { D2eButton } from "./D2eButton";
import "./D2eFileUpload.scss";

export type D2eFileUploadDensity = "default" | "compact";

export interface D2eFileUploadProps {
  density?: D2eFileUploadDensity;
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
  /** File list rendered below the zone (D2eFileUploadItem rows). */
  children?: ReactNode;
  className?: string;
}

export function D2eFileUpload({
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
}: D2eFileUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const emit = (fileList: FileList | null) => {
    if (!fileList || !fileList.length) return;
    onFilesSelected?.(Array.from(fileList));
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
        role="button"
        tabIndex={disabled ? undefined : 0}
        aria-disabled={disabled || undefined}
        onClick={compact ? undefined : openBrowse}
        onKeyDown={(event) => {
          if (!compact && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            openBrowse();
          }
        }}
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
          onChange={(event) => emit(event.target.files)}
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
            <D2eButton
              variant={dragging ? "primary" : "secondary"}
              disabled={disabled}
              onClick={(event) => {
                event.stopPropagation();
                openBrowse();
              }}
            >
              {browseLabel}
            </D2eButton>
          </>
        )}
      </div>

      {children ? <div className="d2e-file-upload__list">{children}</div> : null}
    </div>
  );
}

export default D2eFileUpload;
