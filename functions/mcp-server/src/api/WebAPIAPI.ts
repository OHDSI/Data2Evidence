import { env } from "../env";

export class WebAPIAPI {
  private readonly token: string;
  private readonly channel: any;
  private readonly baseURL: string;
  private readonly datasetId: string;

  constructor() {
    // Initialize with default token and datasetId for internal service communication
    this.token = "bearer";
    this.datasetId = "id";
    // @ts-ignore To ignore Cannot find name 'Trex'
    this.channel = Trex.tokioChannel("d2e-functions/d2e-webapi");
    this.baseURL = env.SERVICE_ROUTES["d2e-webapi"];
  }

  private async getRequestConfig() {
    let options = {
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
      const options = await this.getRequestConfig();
      const url = `${this.baseURL}/cohortdefinition`;
      const response = await this.channel.get(url, options);
      return response.data;
    } catch (error) {
      console.error(error);
      throw new Error(`Error while getting atlas cohort definition`);
    }
  }

  async createAtlasCohortDefinition(
    cohortDefinition: any,
    authorization: string
  ): Promise<any> {
    try {
      const options = await this.getRequestConfig();
      options.headers["Authorization"] = authorization;
      const url = `${this.baseURL}/cohortdefinition`;

      const currentTime = Date.now();
      const expression =
        typeof cohortDefinition.expression === "string"
          ? JSON.parse(cohortDefinition.expression)
          : cohortDefinition.expression;

      const payload = {
        id: 1,
        name: `${cohortDefinition.cohortInfo}`,
        description: `${cohortDefinition.cohortInfo}`,
        expressionType: "SIMPLE_EXPRESSION",
        expression: expression,
        createdBy: cohortDefinition.userName || "researcher",
        createdDate: currentTime,
        modifiedBy: cohortDefinition.userName || "researcher",
        modifiedDate: currentTime,
        tags: [],
      };
      console.log("Cohort creation payload:", JSON.stringify(payload));
      const response = await this.channel.post(url, payload, options);
      console.log("Cohort creation response:", JSON.stringify(response));
      return response.status === 200 ? response.data : null;
    } catch (error) {
      console.error(error);
      throw new Error(`Error while creating atlas cohort definition: ${error}`);
    }
  }
}
