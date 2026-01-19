import { request } from "./request";

const STRATEGUS_RESULTS_URL = "strategus-results";

export class StrategusResults {
  public startStrategusResultViewer(studyId: string, datasetId: string, viewerCode: string) {
    return request({
      baseURL: STRATEGUS_RESULTS_URL,
      url: "/",
      method: "POST",
      data: {
        studyId,
        datasetId,
        viewerCode,
      },
    });
  }

  public stopStrategusResultViewer(studyId: string) {
    return request({
      baseURL: STRATEGUS_RESULTS_URL,
      url: "/",
      method: "DELETE",
      data: {
        studyId,
      },
    });
  }

  public getStrategusResultViewerStatus(studyId: string): Promise<{ running: boolean; message: string }> {
    return request({
      baseURL: STRATEGUS_RESULTS_URL,
      url: `/${studyId}/status`,
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
}
