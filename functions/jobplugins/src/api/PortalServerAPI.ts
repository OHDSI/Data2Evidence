import { services } from "../env.ts";
import { OpenIDAPI } from "./OpenIDAPI.ts";
import { CsvFileOperationResponse } from "../types.ts";

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

  isAuthorized(): boolean {
    return this.baseURL.startsWith("https://localhost:") ||
      this.baseURL.startsWith("https://alp-minerva-gateway-")
      ? false
      : true;
  }

  async getDatasetReleaseById(
    releaseId: string
  ): Promise<{ releaseDate: string }> {
    try {
      const url = `${this.baseURL}/dataset/release/${releaseId}`;
      const options = this.createOptions("GET");
      const result = await fetch(url, options);
      if (!result.ok) {
        throw new Error("Error while getting dataset release by id");
      }
      return await result.json();
    } catch (error) {
      console.error(`Error while getting dataset release by id: ${error}`);
      throw error;
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

  async getFlowRunResults(filePaths) {
    try {
      let url = `${this.baseURL}/prefect/results`;
      const params = new URLSearchParams();
      if (filePaths.length === 1) {
        params.append("filePath", filePaths[0]);
      } else {
        filePaths.forEach((path) => params.append("filePaths[]", path));
      }
      url += `?${params.toString()}`;
      console.info(url);

      // Get client credentials token
      const openIdApi = new OpenIDAPI();
      const clientCredentialsToken =
        await openIdApi.getClientCredentialsToken();

      // Get options with client credentials token instead of user token
      const options = this.createOptions(
        "GET",
        `Bearer ${clientCredentialsToken}`
      );

      const result = await fetch(url, options);
      if (!result.ok) {
        throw new Error(
          `Error while getting flow run results with filePath ${filePaths}`
        );
      }
      const data = await result.json();
      return Array.isArray(data) ? data : [data];
    } catch (error) {
      console.error(
        `Error while getting flow run results with filePath ${filePaths}: ${error}`
      );
      throw error;
    }
  }

  async getConfigByType(type: string) {
    try {
      const url = `${this.baseURL}/config/${type}`;
      const options = this.createOptions("GET");
      const result = await fetch(url, options);
      if (!result.ok) {
        console.log(`Config type '${type}' not found or inaccessible`);
        return null;
      }
      return await result.json();
    } catch (error) {
      console.error(`Error while getting system config: ${error}`);
      return null;
    }
  }

  async uploadCsvFile(
    nodeId: string,
    file: File
  ): Promise<CsvFileOperationResponse> {
    try {
      const url = `${this.baseURL}/supabase-storage/upload/csv`;
      const formData = new FormData();
      formData.append("file", file, file.name);

      const options = {
        method: "POST",
        headers: {
          Authorization: this.token,
        },
        body: formData,
      };

      const result = await fetch(`${url}?nodeId=${nodeId}`, options);
      if (!result.ok) {
        const errorText = await result.text();
        throw new Error(
          `Error while uploading CSV file: ${result.status} - ${errorText}`
        );
      }
      return await result.json();
    } catch (error) {
      console.error(`Error while uploading CSV file: ${error}`);
      throw error;
    }
  }

  async deleteCsvFile(
    nodeId: string,
    fileName: string
  ): Promise<CsvFileOperationResponse> {
    try {
      const url = `${this.baseURL}/supabase-storage/delete/csv`;
      const options = this.createOptions("DELETE");
      const result = await fetch(
        `${url}?nodeId=${nodeId}&fileName=${fileName}`,
        options
      );
      if (!result.ok) {
        const errorText = await result.text();
        throw new Error(
          `Error while deleting CSV file: ${result.status} - ${errorText}`
        );
      }
      return await result.json();
    } catch (error) {
      console.error(`Error while deleting CSV file: ${error}`);
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
