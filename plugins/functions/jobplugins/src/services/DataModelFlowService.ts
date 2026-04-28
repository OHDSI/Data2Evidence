import pg from "pg";
import { PrefectAPI } from "../api/PrefectAPI.ts";
import { PrefectDeploymentName, PrefectFlowName } from "../const.ts";
import {
  DataModel,
  ICreateDatamartFlowRunDto,
  ICreateDatamodelFlowRunDto,
  IGetVersionInfoFlowRunDto,
  PluginFlow,
} from "../types.ts";

export class DataModelFlowService {
  private env = Deno.env.toObject();
  private opt = {
    user: this.env.PG_USER,
    password: this.env.PG_PASSWORD,
    host: this.env.PG__HOST,
    port: parseInt(this.env.PG__PORT),
    database: this.env.PG__DB_NAME,
    ssl: (() => {
      let ssl = JSON.parse(this.env.PG__SSL.toLowerCase());
      if (this.env.PG__CA_ROOT_CERT) {
        ssl = {
          rejectUnauthorized: true,
          ca: this.env.PG__CA_ROOT_CERT,
        };
      }
      return ssl;
    })(),
  };
  private pgclient;

  constructor() {
    this.pgclient = new pg.Client(this.opt);
  }
  public async initialize() {
    await this.pgclient.connect();
  }

  public async getDataModels() {
    const plugins = await this.pgclient.query(
      `SELECT name, payload FROM trex.plugins;`
    );

    let datamodels: DataModel[] = [];
    for (const plugin of plugins.rows) {
      try {
        const payload =
          typeof plugin.payload === "string"
            ? JSON.parse(plugin.payload)
            : plugin.payload;

        if (payload?.flow?.flows) {
          const flows = payload.flow.flows;

          const datamodelFlows = flows
            .filter((flow: PluginFlow) => {
              const flowType = flow.type?.toLowerCase();
              return flowType === "datamodel";
            })
            .flatMap(
              ({ name, datamodels }: { name: string; datamodels: string[] }) =>
                (Array.isArray(datamodels) ? datamodels : []).map(
                  (datamodel) => ({
                    flowName: name,
                    datamodel: datamodel,
                    flowId: "",
                  })
                )
            );

          datamodels = datamodels.concat(datamodelFlows);
        }
      } catch (error) {
        console.error(
          `Error processing plugin ${plugin.name}: ${error.message}`
        );
      }
    }
    return datamodels;
  }

  public async createGetVersionInfoFlowRun(
    getVersionInfoFlowRunDto: IGetVersionInfoFlowRunDto,
    token: string
  ) {
    const prefectApi = new PrefectAPI(token);
    const flowRunName = getVersionInfoFlowRunDto.flowRunName;
    const options = getVersionInfoFlowRunDto.options;
    const flowRunId = await prefectApi.createFlowRun(
      flowRunName,
      options.options.plugin,
      options.options.plugin,
      options
    );

    await prefectApi.createInputAuthToken(flowRunId);

    Promise.any([
      new Promise(() => {
        setTimeout(async () => {
          const msg = "Prefect input authtoken deletion";
          try {
            (await prefectApi.deleteInputAuthToken(flowRunId))
              ? console.log(`${msg} successful`)
              : console.log(`${msg} failed`);
          } catch (error) {
            console.log(`${msg} failed`);
            console.error(error);
          }
        }, 1000 * 60 * 5);
      }),
    ]);

    return flowRunId;
  }

  public async createDatamodelFlowRun(
    createDatamodelFlowRunDto: ICreateDatamodelFlowRunDto,
    token: string
  ) {
    const prefectApi = new PrefectAPI(token);
    const flowRunName = createDatamodelFlowRunDto.flowRunName;
    const options = createDatamodelFlowRunDto.options;
    const flowRunId = await prefectApi.createFlowRun(
      flowRunName,
      options.options.plugin,
      options.options.plugin,
      options
    );
    await prefectApi.createInputAuthToken(flowRunId);

    Promise.any([
      new Promise(() => {
        setTimeout(async () => {
          const msg = "Prefect input authtoken deletion";
          try {
            (await prefectApi.deleteInputAuthToken(flowRunId))
              ? console.log(`${msg} successful`)
              : console.log(`${msg} failed`);
          } catch (error) {
            console.log(`${msg} failed`);
            console.error(error);
          }
        }, 1000 * 60 * 5);
      }),
    ]);
    return flowRunId;
  }

  public async createDatamartFlowRun(
    createDatamartFlowRunDto: ICreateDatamartFlowRunDto,
    token: string
  ) {
    const prefectApi = new PrefectAPI(token);
    const flowRunName = createDatamartFlowRunDto.flowRunName;
    const options = createDatamartFlowRunDto.options;
    const result = await prefectApi.createFlowRun(
      flowRunName,
      PrefectDeploymentName.DATAMART,
      PrefectFlowName.DATAMART,
      options
    );
    await prefectApi.createInputAuthToken(result);

    Promise.any([
      new Promise(() => {
        setTimeout(async () => {
          const msg = "Prefect input authtoken deletion";
          try {
            (await prefectApi.deleteInputAuthToken(result))
              ? console.log(`${msg} successful`)
              : console.log(`${msg} failed`);
          } catch (error) {
            console.log(`${msg} failed`);
            console.error(error);
          }
        }, 1000 * 60 * 5);
      }),
    ]);

    return result;
  }
}
