import { request } from "./request";

export class StrategusResults {
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

  public uploadResultsFromStorage(tokenStudyCode: string, datasetId: string, analysisSpec?: string) {
    return request({
      baseURL: "jobplugins",
      url: "/prefect/strategus-results/upload",
      method: "POST",
      data: { tokenStudyCode, datasetId, analysisSpec },
    });
  }

  public dropResultsFromStorage(tokenStudyCode: string, datasetId: string) {
    return request({
      baseURL: "jobplugins",
      url: `/prefect/strategus-results/drop/${tokenStudyCode}/${datasetId}`,
      method: "DELETE",
    });
  }
}
