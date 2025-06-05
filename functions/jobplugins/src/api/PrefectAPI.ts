import dayjs from "dayjs";
import { decode } from "jsonwebtoken";
import { services } from "../env.ts";
import { IFlowRunQueryDto, IPrefectFlowRunDto } from "../types.ts";

interface FlowRunParams {
  name: string;
  message: string;
  deploymentName: string;
  flowName: string;
  parameters: object;
  schedule?: string | null;
}
export class PrefectAPI {
  private readonly baseURL: string;
  private readonly token: string;

  constructor(token: string) {
    this.token = token;
    if (!token) {
      throw new Error("No token passed for Prefect API!");
    }
    if (services.prefect) {
      this.baseURL = services.prefect;
    } else {
      throw new Error("No url is set for Prefect API");
    }
  }

  async getFlowRun(flowRunId: string) {
    const errorMessage = "Error while getting prefect flow run by id";
    try {
      const url = `${this.baseURL}/flow_runs/filter`;
      const data = {
        flow_runs: {
          id: {
            any_: [flowRunId],
          },
        },
      };

      const options = this.createOptions("POST", data);
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`${errorMessage}: ${response.statusText}`);
      }

      const result = await response.json();
      return result[0];
    } catch (error) {
      console.error(`${errorMessage}: ${error}`);
      throw new Error(errorMessage);
    }
  }

  async getFlowRunById(flowId: string) {
    const options = {
      method: "GET",
      headers: {
        Authorization: this.token,
        "Content-Type": "application/json",
      },
    };
    const url = `${this.baseURL}/flow_runs/${flowId}`;
    const result = await fetch(url, options);
    const jsonResponse = await result.json();
    return jsonResponse;
  }

  async getDeployment(deploymentName: string, flowName: string) {
    const errorMessage = "Error while getting prefect deployment";
    try {
      const options = this.createOptions("GET");
      const url = `${this.baseURL}/deployments/name/${flowName}/${deploymentName}`;
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`${errorMessage}: ${response.statusText}`);
      }
      const result = await response.json();
      return {
        deploymentId: result.id,
        infrastructureDocId: result.infrastructure_document_id,
      };
    } catch (error) {
      console.error(
        `Error occurred while getting prefect deployment: ${error}`
      );
      throw error;
    }
  }

  async getFlowRunsByDataset(
    databaseCode: string,
    dataset: string,
    tags: string[] = []
  ) {
    const errorMessage = "Error while getting flow runs by dataset";
    try {
      const url = `${this.baseURL}/flow_runs/filter`;

      const data = {
        sort: "START_TIME_DESC",
        flow_runs: {
          operator: "and_",
          name: { any_: [`${databaseCode}.${dataset}`] },
          tags: { operator: "and_", all_: tags },
          state: { type: { not_any_: ["CANCELLED", "CANCELLING"] } },
        },
      };

      const options = this.createOptions("POST", data);
      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(`${errorMessage}: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error(`${errorMessage}: ${error}`);
      throw error;
    }
  }

  async getFlowRunsArtifacts(ids: string[]) {
    const errorMessage = `Error while getting prefect artifacts by flow run ids: ${ids}`;
    try {
      const data: Record<string, string | object> = {
        artifacts: {
          flow_run_id: {
            any_: ids,
          },
        },
      };
      const url = `${this.baseURL}/artifacts/filter`;
      const options = this.createOptions("POST", data);
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`Failed to fetch artifacts: ${response.statusText}`);
      }

      const result = await response.json();
      const filteredResult = result.filter(
        (item: { task_run_id: string | null }) => item.task_run_id !== null
      ); // Keep only task runs with non-null taskRunId

      return filteredResult;
    } catch (error) {
      console.error(`${errorMessage}: ${error}`);
      throw error;
    }
  }

  async createFlowRun(
    name: string,
    deploymentName: string,
    flowName: string,
    parameters: object,
    schedule = null
  ) {
    console.log(`Executing flow run ${name}...`);
    const message = `Flow run '${name}' has started from trex function`;
    return await this.executeFlowRun({
      name,
      message,
      deploymentName,
      flowName,
      parameters,
      schedule,
    });
  }

  private async executeFlowRun({
    name,
    message,
    deploymentName,
    flowName,
    parameters,
    schedule = null,
  }: FlowRunParams) {
    const errorMessage = "Error while executing flow run";
    const { deploymentId, infrastructureDocId } = await this.getDeployment(
      deploymentName,
      flowName
    );
    const data = {
      state: {
        type: "SCHEDULED",
        message,
        ...(schedule ? { state_details: { scheduled_time: schedule } } : {}),
      },
      name,
      parameters,
      infrastructure_document_id: infrastructureDocId,
      empirical_policy: {
        retries: 0,
        retry_delay: 0,
        resuming: false,
      },
    };
    const options = this.createOptions("POST", data);
    const url = `${this.baseURL}/deployments/${deploymentId}/create_flow_run`;

    if (schedule && !dayjs(schedule).isValid()) {
      throw new Error(`Invalid schedule time`);
    }
    if (schedule && dayjs(schedule).isBefore(dayjs())) {
      throw new Error("Schedule time must be in the future");
    }
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`${errorMessage}: ${response.statusText}`);
    }

    const result = await response.json();
    return result.id;
  }

  async getFlowRunsByDeploymentNames(
    deploymentNames: string[],
    extraFilter?: IFlowRunQueryDto
  ) {
    const errorMessage =
      "Error while getting prefect flow runs by deployment names";
    try {
      const method = "POST";
      const url = `${this.baseURL}/flow_runs/filter`;

      const data: Record<string, string | object> = {
        sort: "START_TIME_DESC",
        ...this.getFilters({ ...extraFilter, deploymentNames }),
      };

      const options = this.createOptions(method, data);

      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(`${errorMessage}: ${response.statusText}`);
      }

      const result = await response.json();

      return result;
    } catch (error) {
      console.error(`${errorMessage}: ${error}`);
      throw error;
    }
  }

  private getFilters(filter?: IFlowRunQueryDto) {
    if (filter == null) {
      return {};
    }

    const flowRuns: Record<string, string | object> = {};

    if (filter.startDate || filter.endDate) {
      flowRuns["expected_start_time"] = {
        after_: filter.startDate,
        before_: filter.endDate,
      };
    }

    if (filter.states) {
      flowRuns["state"] = {
        name: {
          any_: filter.states,
        },
      };
    }

    if (filter.tags) {
      flowRuns["tags"] = {
        all_: filter.tags,
      };
    }

    const flows: Record<string, string | object> = {};

    if (filter.flowIds) {
      flows["id"] = {
        any_: filter.flowIds,
      };
    }

    const deployments: Record<string, string | object> = {};

    if (filter.deploymentIds) {
      deployments["id"] = {
        any_: filter.deploymentIds,
      };
    }

    if (filter.deploymentNames) {
      deployments["name"] = {
        any_: filter.deploymentNames,
      };
    }

    const workPools: Record<string, string | object> = {};

    if (filter.workPools) {
      workPools["name"] = {
        any_: filter.workPools,
      };
    }

    return {
      flows,
      flow_runs: flowRuns,
      deployments,
      work_pools: workPools,
    };
  }

  private createOptions(method: string, data?: object): RequestInit {
    const headers: Record<string, string> = {
      Authorization: this.token,
    };

    // Only add Content-Type for requests that have a body (not for GET)
    if (method !== "GET" && data) {
      headers["Content-Type"] = "application/json";
    }

    return {
      method,
      headers,
      // Only include body for non-GET requests
      body: method !== "GET" && data ? JSON.stringify(data) : undefined,
    };
  }

  async createInputAuthToken(flowrunId: string) {
    const retries = 3;
    const key = "authtoken"; // keyword "authtoken" must match the object name in Python flow

    const thirdPartyToken: string | undefined = decode(
      this.token.replace(/bearer /i, ""),
    )['thirdPartyToken'];

    const options = this.createOptions("POST", {
      key: key,
      value: JSON.stringify({ 
        token: this.token,
        thirdpartytoken: thirdPartyToken || ''
      }), // 'value' must be a string always. Convert the json object to a string
    });
    const errorMessage =
      "Error occurred while passing user token to the flow run";
    const url = `${this.baseURL}/flow_runs/${flowrunId}/input`;

    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, options);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        if (i < retries) {
          await new Promise((resolve) => setTimeout(resolve, 1000)); // wait 500ms before retrying
        } else {
          throw new Error(`${errorMessage}: ${error.message}`);
        }
      }
    }
  }

  async deleteInputAuthToken(flowrunId: string) {
    const retries = 3;
    const errorMessage =
      'Error occurred while deleting "authtoken" flowrun input';
    const key = "authtoken"; // keyword "authtoken" must match the object name in Python flow
    const options = this.createOptions("DELETE");
    const url = `${this.baseURL}/flow_runs/${flowrunId}/input/${key}`;

    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, options);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.status == 204;
      } catch (error) {
        if (i < retries) {
          await new Promise((resolve) => setTimeout(resolve, 1000)); // wait 500ms before retrying
        } else {
          throw new Error(`${errorMessage}: ${error.message}`);
        }
      }
    }
  }

  async getFlowRunLogs(id: string) {
    const errorMessage = "Error while getting prefect flow run logs by id";
    try {
      const url = `${this.baseURL}/logs/filter`;

      const data = {
        offset: 0,
        logs: {
          flow_run_id: {
            any_: [id],
          },
        },
        sort: "TIMESTAMP_ASC",
      };
      const options = this.createOptions("POST", data);
      const r = await fetch(url, options);
      if (!r.ok) {
        throw new Error(`${r.statusText}`);
      }
      console.log(`fetched prefect logs for flowrun: ${id}`);
      return await r.json();
    } catch (error) {
      console.info(`${errorMessage}: ${error}`);
      throw new Error(errorMessage);
    }
  }

  async cancelFlowRun(id: string) {
    const errorMessage = `Error while cancelling flow run with id: ${id}`;
    try {
      const url = `${this.baseURL}/flow_runs/${id}/set_state`;
      const data = { state: { type: "CANCELLED" } };
      const options = this.createOptions("POST", data);
      const r = await fetch(url, options);
      if (!r.ok) {
        throw new Error(`${r.statusText}`);
      }
      console.log(`cancelled prefect flowrun: ${id}`);
      return await r.json();
    } catch (error) {
      console.info(`${errorMessage}: ${error}`);
      throw new Error(errorMessage);
    }
  }

  async getFlowRunState(id: string) {
    const errorMessage = "Error while getting prefect flow run states by id";
    try {
      const url = `${this.baseURL}/flow_runs/${id}`;
      const options = this.createOptions("GET");
      const r = await fetch(url, options);
      if (!r.ok) {
        throw new Error(`${r.statusText}`);
      }
      console.log(`fetched state of flowrun: ${id}`);
      return await r.json();
    } catch (error) {
      console.info(`${errorMessage}: ${error}`);
      throw new Error(errorMessage);
    }
  }

  async getFlowRunsByParentFlowRunId(parentFlowRunId: string) {
    const errorMessage = `Error while getting prefect flow run by parent flow run id: ${parentFlowRunId}`;
    try {
      const url = `${this.baseURL}/flow_runs/filter`;
      const data: Record<string, string | object> = {
        flow_runs: {
          parent_flow_run_id: {
            any_: [parentFlowRunId],
          },
        },
      };
      const options = await this.createOptions("POST", data);
      const r = await fetch(url, options);
      if (!r.ok) {
        throw new Error(r.statusText);
      }
      return await r.json();
    } catch (error) {
      console.info(`${errorMessage}: ${error}`);
      throw new Error(errorMessage);
    }
  }

  async getFlowRunsArtifactsByFlowRunId(flowRunId: string) {
    const errorMessage = `Error while getting prefect flow run artifacts flow run id: ${flowRunId}`;
    try {
      const url = `${this.baseURL}/artifacts/filter`;
      const data: Record<string, string | object> = {
        flow_runs: {
          id: {
            any_: [flowRunId],
          },
        },
      };
      const options = await this.createOptions("POST", data);
      const res = await fetch(url, options);
      if (!res.ok) {
        throw new Error(res.statusText);
      }
      return await res.json();
    } catch (error) {
      console.info(`${errorMessage}: ${error}`);
      throw new Error(errorMessage);
    }
  }
}
