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
    analysisSpec: any
  ): Promise<{ message: string; analysisId: string }> {
    const headers = {
      "Content-Type": "application/json",
      Authorization: this.token,
    };
    const body = JSON.stringify({
      studyId,
      analysisSpec,
      notebookName,
      mode: "kernel",
    });

    const response = await this.channel.post(
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
}
