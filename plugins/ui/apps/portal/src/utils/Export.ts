import { saveAs } from "file-saver";
import { scanForCharsToEscapeAndSurroundQuotes } from "./EscapeAndSurroundQuotes";
import { OverviewResults } from "../components/DQD/types";

export interface DownloadColumn {
  header: string;
  accessor: string;
}

export const dqdParseToCsv = (data: { [key: string]: string | number }[]) => {
  const headers = data.reduce((keys: string[], obj) => {
    Object.keys(obj).forEach((key) => {
      if (!keys.includes(key)) {
        keys.push(key);
      }
    });
    return keys;
  }, []);

  const separatorRegex = new RegExp(`${","}|${"\r\n"}|${"\n"}`, "g");
  const result: string[] = [];

  data.forEach((d) => {
    const arr: string[] = [];
    headers.forEach((header) => {
      arr.push(
        scanForCharsToEscapeAndSurroundQuotes({
          columnValue: d[header],
          separatorRegex,
          noValue: "NO VALUE",
        })
      );
    });
    result.push(arr.join(","));
  });
  return [headers.join(","), ...result].join("\n");
};

export const parseToCsv = (data: { [key: string]: string | number }[], columns: DownloadColumn[]) => {
  const headers = columns.map((column) => column.header);
  const separatorRegex = new RegExp(`${","}|${"\r\n"}|${"\n"}`, "g");
  const result: string[] = [];

  data.forEach((d) => {
    const arr: string[] = [];
    columns.forEach((column) => {
      arr.push(
        scanForCharsToEscapeAndSurroundQuotes({
          columnValue: d[column.accessor],
          separatorRegex,
          noValue: "NO VALUE",
        })
      );
    });
    result.push(arr.join(","));
  });
  return [headers.join(","), ...result].join("\n");
};

export const filterJSON = (data: { [key: string]: string | number }[], overview: OverviewResults | undefined) => {
  return JSON.stringify({ overview: overview, checkResults: data });
};

export const downloadFile = ({ data, fileName, fileType }: { data: any; fileName: string; fileType: string }) => {
  const blob = new Blob([data], { type: fileType });
  saveAs(blob, fileName);
};
