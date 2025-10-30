import { request } from "./request";
import { API_PATHS } from "../constants/api";

const STRATEGUS_RESULTS_URL = API_PATHS.STRATEGUS_RESULTS;

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
}
