import { request } from "./request";
import { NetworkStrategusStudy } from "../types";
const STRATEGUS_ANALYSIS_URL = "strategus/analysis";

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
}
