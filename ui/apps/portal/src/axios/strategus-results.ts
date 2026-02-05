import { request } from "./request";

const STRATEGUS_RESULTS_URL = "strategus-results";

export class StrategusResults {
  public startStrategusResultViewer(studyId: string, datasetId: string, viewerCode: string, dashboardName?: string) {
    return request({
      baseURL: STRATEGUS_RESULTS_URL,
      url: "/",
      method: "POST",
      data: {
        studyId,
        datasetId,
        viewerCode,
        dashboardName,
      },
    });
  }

  public stopStrategusResultViewer(studyId: string, dashboardName?: string) {
    return request({
      baseURL: STRATEGUS_RESULTS_URL,
      url: "/",
      method: "DELETE",
      data: {
        studyId,
        dashboardName,
      },
    });
  }

  public getStrategusResultViewerStatus(studyId: string, dashboardName?: string): Promise<{ running: boolean; message: string }> {
    // Construct the container ID to match backend routing
    const containerId = dashboardName ? `${studyId}_${dashboardName}` : studyId;
    return request({
      baseURL: STRATEGUS_RESULTS_URL,
      url: `/${containerId}/status`,
      method: "GET",
    });
  }

  public uploadStrategusResultsFile(studyId: string, file: File) {
    const formData = new FormData();
    formData.append("file", file);

    return request({
      baseURL: "jobplugins",
      url: `/strategus-results/upload?studyId=${studyId}`,
      method: "POST",
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  }

  public listStrategusResultsFiles(studyId: string) {
    return request({
      baseURL: "jobplugins",
      url: `/strategus-results/list?studyId=${studyId}`,
      method: "GET",
    });
  }

  public downloadStrategusResultsFile(studyId: string, fileName: string) {
    return request({
      baseURL: "jobplugins",
      url: `/strategus-results/download?studyId=${studyId}&fileName=${fileName}`,
      method: "GET",
    });
  }

  public deleteStrategusResultsFile(studyId: string, fileName: string) {
    return request({
      baseURL: "jobplugins",
      url: `/strategus-results/delete?studyId=${studyId}&fileName=${fileName}`,
      method: "DELETE",
    });
  }

  public triggerStrategusResultsFlow(payload: any) {
    return request({
      baseURL: "jobplugins",
      url: "/prefect/jupyter-kernel/flow-run/strategus",
      method: "POST",
      data: payload,
    });
  }

  public uploadResultsFromStorage(studyId: string, datasetId: string, analysisSpec?: string) {
    return request({
      baseURL: "jobplugins",
      url: "/prefect/strategus-results/upload",
      method: "POST",
      data: { studyId, datasetId, analysisSpec },
    });
  }

  public dropResultsFromStorage(studyId: string, datasetId: string) {
    return request({
      baseURL: "jobplugins",
      url: `/prefect/strategus-results/drop/${studyId}/${datasetId}`,
      method: "DELETE",
    });
  }
}
