import { request } from "./request";
import { NetworkStrategusStudy } from "../types";
const STRATEGUS_ANALYSIS_URL = "strategus/analysis";
const STRATEGUS_TEMPLATE_URL = "strategus/template";

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

  public getStudyViewerTemplates() {
    return request({
      baseURL: STRATEGUS_TEMPLATE_URL,
      method: "GET",
    });
  }
}
