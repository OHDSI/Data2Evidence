import { saveAs } from "file-saver";
import { scanForCharsToEscapeAndSurroundQuotes } from "./EscapeAndSurroundQuotes";
import { OverviewResults, mappingData } from "../types";

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

// Pure/testable: builds the CSV export for Step 3's "Download as CSV" action. Only
// approved-and-not-flagged rows are included - a flag means the row still needs review,
// even if it was approved before being flagged.
export const buildApprovedConceptMappingCsv = (rows: mappingData[], columns: DownloadColumn[]): string => {
  const approvedRows = rows.filter((row) => row.status === "approved" && !row.flagged);
  return parseToCsv(approvedRows, columns);
};

export const filterJSON = (data: { [key: string]: string | number }[], overview: OverviewResults | undefined) => {
  return JSON.stringify({ overview: overview, checkResults: data });
};

export const downloadFile = ({ data, fileName, fileType }: { data: any; fileName: string; fileType: string }) => {
  const blob = new Blob([data], { type: fileType });
  saveAs(blob, fileName);
};
