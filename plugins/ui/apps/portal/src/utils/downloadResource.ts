import { saveBlobAs } from "./utils";

export const base64ToBlob = (base64Data: string, contentType = "application/octet-stream"): Blob => {
  const byteString = window.atob(base64Data);
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const uint8Array = new Uint8Array(arrayBuffer);

  for (let i = 0; i < byteString.length; i++) {
    uint8Array[i] = byteString.charCodeAt(i);
  }

  return new Blob([uint8Array], { type: contentType });
};

export const downloadFromJsonResponse = async (response: Response, fileName: string): Promise<void> => {
  const jsonText = await response.text();
  const jsonData = JSON.parse(jsonText);

  const blob = base64ToBlob(jsonData.data, jsonData.contentType);
  saveBlobAs(blob, fileName);
};

export const downloadFile = ({ data, fileName, fileType }: { data: any; fileName: string; fileType: string }): void => {
  const blob = new Blob([data], { type: fileType });
  saveBlobAs(blob, fileName);
};
