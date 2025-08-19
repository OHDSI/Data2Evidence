import { services } from "../../env.ts";

export class PortalServerAPI {
  private readonly baseURL: string;
  private readonly token: string;

  constructor(token: string) {
    this.token = token;
    if (!token) {
      throw new Error("No token passed for PortalServerAPI!");
    }
    if (services.portalServer) {
      this.baseURL = services.portalServer;
    } else {
      throw new Error("No url is set for PortalServerAPI");
    }
  }

  async getDataset(datasetId: string) {
    try {
      const url = `${this.baseURL}/dataset`;
      const queryParams = new URLSearchParams({ datasetId });
      const options = this.createOptions("GET");
      const result = await fetch(`${url}?${queryParams.toString()}`, options);
      if (!result.ok) {
        throw new Error("Error while getting dataset by datasetId");
      }
      return await result.json();
    } catch (error) {
      console.error(`Error while getting dataset by datasetId: ${error}`);
      throw error;
    }
  }

  async getGitStudies() {
    try {
      const url = `${this.baseURL}/git-studies/studies`;
      const options = this.createOptions("GET");
      const result = await fetch(url, options);
      if (!result.ok) {
        throw new Error(
          `Error while getting git studies: ${result.status} ${result.statusText}`
        );
      }
      return await result.json();
    } catch (error) {
      console.error(`Error while getting git studies: ${error}`);
      throw error;
    }
  }

  private createOptions(method: string, token = this.token): RequestInit {
    return {
      method,
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
    };
  }
}
