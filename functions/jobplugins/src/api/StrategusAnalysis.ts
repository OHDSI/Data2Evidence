import { services } from "../env.ts";

export class StrategusAnalysisApi {
  private token: string;
  private baseUrl: string;

  constructor(token: string) {
    this.token = token;
    if (services["strategus-analysis"]) {
        this.baseUrl = services["strategus-analysis"];
    } else {
        throw new Error("No url is set for Prefect API");
    }
  }

  public async saveAnalysis(studyId: string, analysisSpec: any): Promise<{ message: string; analysisId: string }> {
    const response = await fetch(`${this.baseUrl}/strategus/analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.token
      },
      body: JSON.stringify({
        studyId,
        analysisSpec
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to save analysis: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }
}