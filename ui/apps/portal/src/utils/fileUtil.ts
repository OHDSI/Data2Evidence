import memoize from "lodash/memoize";

export const getFileSizeDisplay = memoize((fileSizeInBytes: number) => {
  const fileUnits = ["Bytes", "KB", "MB", "GB"];

  let fileSize: number = fileSizeInBytes;
  let i = 0;
  while (fileSize > 900) {
    fileSize = fileSize / 1024;
    i++;
  }
  return `${fileSize.toFixed(0)} ${fileUnits[i]}`;
});

export const getFileExtension = memoize((filename?: string) => {
  return filename?.slice(((filename?.lastIndexOf(".") - 1) >>> 0) + 2) || "";
});
