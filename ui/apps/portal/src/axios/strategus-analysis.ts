import { request } from "./request";
import { NetworkStrategusStudy } from "../types";
import { API_PATHS } from "../constants/api";
const STRATEGUS_ANALYSIS_URL = API_PATHS.STRATEGUS_ANALYSIS;

export class StrategusAnalysis {
  public getAllStrategusAnalysis(): Promise<NetworkStrategusStudy[]> {
    return request({
      baseURL: STRATEGUS_ANALYSIS_URL,
      url: "/",
      method: "GET",
    });
  }

  public getStrategusAnalysis(studyId: string): Promise<NetworkStrategusStudy> {
    return request({
      baseURL: STRATEGUS_ANALYSIS_URL,
      url: `/${studyId}`,
      method: "GET",
    });
  }

  public saveStategusAnalysisViewerCode(studyId: string, code: string) {
    return request({
      baseURL: STRATEGUS_ANALYSIS_URL,
      url: "/code",
      method: "POST",
      data: {
        studyId,
        viewerCode: code,
      },
    });
  }
}
