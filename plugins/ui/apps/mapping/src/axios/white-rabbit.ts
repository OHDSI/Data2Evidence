import { ScanDataDBConnectionForm } from "../types/scanDataDialog";
import { EtlModel } from "../utils/etl-transformer";
import request from "./request";

const WHITE_RABBIT_BASE_ENDPOINT = `white-rabbit/api/`;
const JOBPLUGINS_BASE_ENDPOINT = `jobplugins/white-rabbit/`;

export interface WhiteRabbitJobStatus {
  state_name: string;
  id: string;
}

export class WhiteRabbit {
  public createScanReport(nodeId: string, fileNames: string[], delimiter: string = ",") {
    const data = {
      options: {
        data: {
          node_id: nodeId,
          files: fileNames,
          settings: { delimiter },
        },
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

  public createDBScanReport(postgresqlForm: ScanDataDBConnectionForm, tablesToScan: string[], nodeId: string) {
    const iniSettings = {
      ...postgresqlForm,
      tables_to_scan: tablesToScan.join(","),
    };

    const data = {
      options: {
        data: iniSettings,
        run_type: "SCAN_REPORT_DB",
        node_id: nodeId,
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

  public createEtlReport(etlModel: EtlModel, nodeId: string) {
    const data = {
      options: {
        run_type: "GENERATE_ETL_REPORT",
        data: { ...etlModel, node_id: nodeId },
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
