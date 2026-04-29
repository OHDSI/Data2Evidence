import React, { ChangeEvent, FC, HTMLAttributes, useCallback, useState } from "react";
import classNames from "classnames";
import "./ZipFileUpload.scss";

export interface ZipFileUploadProps extends Omit<HTMLAttributes<HTMLDivElement>, "onError"> {
  onError?: (error: Error) => void;
  onUpload: (uploadedFile: File) => void;
}

export const ZipFileUpload: FC<ZipFileUploadProps> = ({ className = "", style = {}, onError, onUpload }) => {
  const classes = classNames("alp-zip-file-upload", { [`${className}`]: !!className });
  const [fileName, setFileName] = useState<string | undefined>();

  const handleChangeFile = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files: FileList = e.target.files!;
      if (files.length > 0) {
        const fileName = files[0].name;
        if (files[0].type !== "application/zip") {
          setFileName("");
          typeof onError === "function" &&
            onError(new Error(`Unsupported file type: ${fileName.substring(fileName.lastIndexOf("."))}`));
          return;
        }
        onUpload(files[0]);
        setFileName(fileName);
      }
    },
    [onError, onUpload]
  );

  return (
    <div className={classes} style={style}>
      <label>File:</label>
      <div className="alp-zip-file-upload__wrapper">
        <input
          className="alp-zip-file-upload__file"
          type="file"
          id="file"
          data-testid="file"
          onChange={handleChangeFile}
        />
        <label htmlFor="file">
          <strong>Click here to choose a file, or drop a file</strong>
          <div>Supported file type: Zip</div>
          {fileName && (
            <div>
              <strong>Uploaded file:</strong> {fileName}
            </div>
          )}
        </label>
      </div>
    </div>
  );
};
