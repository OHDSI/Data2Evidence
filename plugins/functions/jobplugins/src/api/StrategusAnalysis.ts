import { services } from "../env.ts";

export class StrategusAnalysisApi {
  private token: string;
  private baseUrl: string;
  private readonly channel;

  constructor(token: string) {
    this.token = token;
    if (services["strategus-analysis"]) {
      this.baseUrl = services["strategus-analysis"];
      this.channel = Trex.tokioChannel("d2e-functions/strategus-analysis");
    } else {
      throw new Error("No url is set for Strategus Analysis API");
    }
  }

  public async saveAnalysis(
    studyId: string,
    notebookName: string,
    analysisSpec: any,
    databaseCode: string,
    mode: string,
  ): Promise<{ message: string; analysisId: string }> {
    const headers = {
      "Content-Type": "application/json",
      Authorization: this.token,
    };
    const body = JSON.stringify({
      studyId,
      analysisSpec,
      notebookName,
      mode,
      databaseCode,
    });

    const response = await this.channel.put(
      `${this.baseUrl}/strategus/analysis`,
      body,
      { headers }
    );

    if (response.status !== 200) {
      throw new Error(
        `Failed to save analysis: ${response.status} ${response.statusText}`
      );
    }

    return await response.data;
  }

  public async getStudy(studyId: string): Promise<any> {
    const headers = {
      "Content-Type": "application/json",
      Authorization: this.token,
    };

    const response = await this.channel.get(
      `${this.baseUrl}/strategus/analysis/${studyId}`,
      { headers }
    );

    if (response.status !== 200) {
      throw new Error(
        `Failed to get analysis for study ${studyId}: ${response.status} ${response.statusText}`
      );
    }

    return await response.data;
  }
}
