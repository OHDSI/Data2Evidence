import { request } from "./request";

const STRATEGUS_RESULTS_URL = "strategus-results";

export class StrategusResults {
  public startStrategusResultViewer(studyId: string, datasetId: string) {
    return request({
      baseURL: STRATEGUS_RESULTS_URL,
      url: "/",
      method: "POST",
      data: {
        studyId,
        datasetId,
      },
    });
  }
}
