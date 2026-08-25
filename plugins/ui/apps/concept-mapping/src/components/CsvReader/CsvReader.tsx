import React, { ChangeEvent, FC, HTMLAttributes, useCallback } from "react";
import * as PapaParse from "papaparse";
import { useTranslation } from "../../hooks/use-translation";
import { i18nKeys } from "../../Context/state";
import "./CsvReader.scss";

export interface CsvFileInfo {
  name: string;
  size: number;
}

export interface CsvReaderProps extends Omit<HTMLAttributes<HTMLDivElement>, "onError"> {
  fileEncoding?: string;
  onFileLoaded: (data: { name: string; size: number; data: PapaParse.ParseResult<any> }) => void;
  // Fires synchronously as soon as a file is picked/dropped, before the (async)
  // FileReader read - lets a consumer show an "uploading" state for the real gap between
  // pick and onFileLoaded/onError.
  onFileSelected?: (fileInfo: CsvFileInfo) => void;
  // fileInfo is included (when available) so a consumer can render the filename/size in an
  // error state without having to track it separately.
  onError?: (error: Error, fileInfo?: CsvFileInfo) => void;
  parseOptions?: PapaParse.ParseConfig;
}

export const CsvReader: FC<CsvReaderProps> = ({
  className = "",
  style = {},
  fileEncoding,
  onFileLoaded,
  onFileSelected,
  onError,
  parseOptions = {},
}) => {
  const { getText } = useTranslation();
  const handleChangeFile = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files: FileList = e.target.files!;
      if (files.length > 0) {
        const file = files[0];
        const fileInfo: CsvFileInfo = { name: file.name, size: file.size };
        typeof onFileSelected === "function" && onFileSelected(fileInfo);

        if (!["text/csv", "text/plain"].includes(file.type)) {
          typeof onError === "function" &&
            onError(new Error(getText(i18nKeys.CSV_READER__UNSUPPORTED_FILE_TYPE)), fileInfo);
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          const csvData = PapaParse.parse(
            reader.result as string,
            Object.assign(parseOptions, {
              error: (err: Error) => typeof onError === "function" && onError(err, fileInfo),
              encoding: fileEncoding,
            })
          );
          onFileLoaded({ name: file.name, size: file.size, data: csvData });
        };

        reader.readAsText(file, fileEncoding);
      }
    },
    [onFileLoaded, onFileSelected, onError, parseOptions, fileEncoding, getText]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLInputElement>) => {
      e.preventDefault();
      const files = e.dataTransfer.files;
      const event = { target: { files } } as ChangeEvent<HTMLInputElement>;
      handleChangeFile(event);
    },
    [handleChangeFile]
  );

  return (
    <div className={`csv-reader ${className}`} style={style}>
      <label>File</label>
      <div className="csv-reader__wrapper" onDrop={handleDrop} onDragOver={(event) => event.preventDefault()}>
        <input
          className="csv-reader__file"
          type="file"
          name="files[]"
          id="file"
          data-testid="file"
          onChange={handleChangeFile}
        />
        <label htmlFor="file">
          <strong>{getText(i18nKeys.CSV_READER__CLICK_MESSAGE)}</strong>
          <div>{getText(i18nKeys.CSV_READER__SUPPORTED_FILE_TYPES)}</div>
        </label>
      </div>
    </div>
  );
};
