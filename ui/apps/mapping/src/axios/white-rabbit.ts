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

    const jsonString = JSON.stringify({
      files: fileContents,
      settings: {
        delimiter,
      },
    });
    const compressed = pako.gzip(jsonString);
    const base64Compressed = Buffer.from(compressed).toString("base64");

    const data = {
      options: {
        username: "admin",
        data: base64Compressed,
        run_type: "SCAN_REPORT_FILES",
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

  public getScanReport(id: string) {
    return request({
      url: `${WHITE_RABBIT_BASE_ENDPOINT}scan-report/result-as-resource/${id}`,
      method: "GET",
      responseType: "blob",
    });
  }

  public async getScanResult(id: string): Promise<{ fileId: number; fileName: string }> {
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

  public createDBScanReport(postgresqlForm: ScanDataDBConnectionForm, tablesToScan: string[]) {
    const iniSettings = {
      ...postgresqlForm,
      server_location: `${postgresqlForm.server}:${postgresqlForm.port}/${postgresqlForm.database}`,
      tables_to_scan: tablesToScan.join(","),
      database: postgresqlForm.schema, //
    };

    const data = {
      options: {
        username: "admin",
        data: iniSettings,
        run_type: "SCAN_REPORT_DB",
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

  public createEtlReport(etlModel: EtlModel) {
    const data = {
      options: {
        run_type: "GENERATE_ETL_REPORT",
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
