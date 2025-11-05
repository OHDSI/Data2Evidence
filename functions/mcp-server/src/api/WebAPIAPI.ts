import { env } from "../env";

export class WebAPIAPI {
  private readonly token: string;
  private readonly webapiapi: any;
  private readonly baseURL: string;
  private readonly datasetId: string;

  constructor(token: string, datasetId: string) {
    this.token = token;
    this.datasetId = datasetId;
    this.webapiapi = Trex.tokioChannel("d2e-functions/d2e-webapi");
    this.baseURL = env.SERVICE_ROUTES["d2e-webapi"];
    if (!token) {
      throw new Error("No token passed for WebAPIAPI!");
    }
  }

  private async getRequestConfig() {
    const options = {
      headers: {
        Authorization: this.token,
        datasetId: this.datasetId,
      },
      timeout: 20000,
    };
    return options;
  }

  async getAtlasCohortDefinitionList(): Promise<any> {
    try {
      // @ts-ignore To ignore Cannot find name 'Trex'

      const options = await this.getRequestConfig();
      const url = `${this.baseURL}/cohortdefinition`;
      const response = await this.webapiapi.get(url, options);
      return response.data;
    } catch (error) {
      console.error(error);
      throw new Error(`Error while getting atlas cohort definition`);
    }
  }
}
