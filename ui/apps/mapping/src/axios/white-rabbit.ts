import { ScanDataDBConnectionForm } from "../types/scanDataDialog";
import { EtlModel } from "../utils/etl-transformer";
import request from "./request";
import pako from "pako";
import { Buffer } from "buffer";

const WHITE_RABBIT_BASE_ENDPOINT = `white-rabbit/api/`;
const JOBPLUGINS_BASE_ENDPOINT = `jobplugins/white-rabbit/`;

export interface WhiteRabbitJobStatus {
  state_name: string;
  id: string;
}

export class WhiteRabbit {
  public async createScanReport(files: File[], delimiter: string = ",") {
    const csvToJSON = async (file: File): Promise<any[]> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsText(file);
        reader.onload = () => {
          const csvText = reader.result as string;
          const lines = csvText.split("\n");
          const headers = lines[0].split(delimiter).map((header) => header.trim());

          const jsonArray = lines
            .slice(1)
            .filter((line) => line.trim() !== "") // Skip empty lines
            .map((line) => {
              const values = line.split(delimiter);
              return headers.reduce((obj, header, index) => {
                obj[header] = values[index]?.trim() || "";
                return obj;
              }, {} as any);
            });

          resolve(jsonArray);
        };
        reader.onerror = (error) => reject(error);
      });
    };

    const fileContents = await Promise.all(
      files.map(async (file) => ({
        fileName: file.name,
        fileContent: await csvToJSON(file),
      }))
    );

    // Compress the data
    const jsonString = JSON.stringify({
      files: fileContents,
      settings: {
        fileType: "CSV files",
        delimiter,
        scanDataParams: {
          sampleSize: 100000,
          scanValues: true,
          minCellCount: 5,
          maxValues: 1000,
          calculateNumericStats: false,
          numericStatsSamplerSize: 100000,
        },
      },
    });
    const compressed = pako.gzip(jsonString);
    const base64Compressed = Buffer.from(compressed).toString('base64');


    const data = {
      options: {
        url: "scan-report/files",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        data: base64Compressed,
      },
    };

    return request({
      url: `${JOBPLUGINS_BASE_ENDPOINT}flow-run`,
      method: "POST",
      data: data,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  public getScanReportProgress(id: number) {
    return request({
      url: `${WHITE_RABBIT_BASE_ENDPOINT}scan-report/conversion/${id}`,
      method: "GET",
    });
  }

  public getScanReport(id: number) {
    return request({
      url: `${WHITE_RABBIT_BASE_ENDPOINT}scan-report/result-as-resource/${id}`,
      method: "GET",
      responseType: "blob",
    });
  }

  public async getScanResult(id: number): Promise<{ fileId: number; fileName: string }> {
    return request({
      url: `${WHITE_RABBIT_BASE_ENDPOINT}scan-report/result/${id}`,
      method: "GET",
    });
  }

  public testDBConnection(connectionDetail: ScanDataDBConnectionForm) {
    return request({
      url: `${WHITE_RABBIT_BASE_ENDPOINT}test-connection`,
      method: "POST",
      data: connectionDetail,
    });
  }

  public generateEtlReport(formatType: "word", etlModel: EtlModel) {
    return request({
      url: `${WHITE_RABBIT_BASE_ENDPOINT}report/${formatType}`,
      method: "POST",
      responseType: "blob",
      data: etlModel,
    });
  }

  public createDBScanReport(postgresqlForm: ScanDataDBConnectionForm, tablesToScan: string[]) {
    const data = {
      options: {
        url: "scan-report/db",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        data: {
          ...postgresqlForm,
          scanDataParams: {
            sampleSize: 100000,
            scanValues: true,
            minCellCount: 5,
            maxValues: 1000,
            calculateNumericStats: false,
            numericStatsSamplerSize: 100000,
          },
          tablesToScan: tablesToScan.join(","),
        },
      },
    };
    return request({
      url: `${JOBPLUGINS_BASE_ENDPOINT}flow-run`,
      method: "POST",
      data: data,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  public getFlowRunStatus(flowRunId: string): Promise<WhiteRabbitJobStatus> {
    return request({
      url: `${JOBPLUGINS_BASE_ENDPOINT}results/${flowRunId}`,
      method: "GET",
    });
  }

  public getScanIdByFlowRunId(flowRunId: string) {
    return request({
      url: `${JOBPLUGINS_BASE_ENDPOINT}artifacts/${flowRunId}`,
      method: "GET",
    });
  }

  public createEtlReport(etlModel: EtlModel) {
    const data = {
      options: {
        url: "report/word",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        data: etlModel,
      },
    };
  
    return request({
      url: `${JOBPLUGINS_BASE_ENDPOINT}flow-run`,
      method: "POST",
      data: data,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
  
  public getEtlReportFromArtifacts(flowRunId: string) {
    return request({
      url: `${JOBPLUGINS_BASE_ENDPOINT}etl-report/${flowRunId}`,
      method: "GET",
      responseType: "blob",
    });
  }
}
