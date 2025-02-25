import { ScanDataDBConnectionForm } from "../types/scanDataDialog";
import { EtlModel } from "../utils/etl-transformer";
import request from "./request";

const WHITE_RABBIT_BASE_ENDPOINT = `white-rabbit/api/`;

export class WhiteRabbit {
  public createScanReport(files: File[], delimiter: string = ",") {
    const formData = new FormData();

    const settings = {
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
    };
    formData.append("settings", JSON.stringify(settings));

    // Append each file to the FormData object
    files.forEach((file) => {
      formData.append("files", file, file.name);
    });

    return request({
      url: `${WHITE_RABBIT_BASE_ENDPOINT}scan-report/files`,
      method: "POST",
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  }

  public createDBScanReport(postgresqlForm: ScanDataDBConnectionForm, tablesToScan: string[]) {
    const data = {
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
    };

    return request({
      url: `${WHITE_RABBIT_BASE_ENDPOINT}scan-report/db`,
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

  public getScanResult(id: number) {
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
}
