import { services } from "../env.ts";
import { OpenIDAPI } from "./OpenIDAPI.ts";
import { CsvFileOperationResponse, FileOperationResponse } from "../types.ts";

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
      const url = `${this.baseURL}/dataset/release/${encodeURIComponent(
        releaseId
      )}`;
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

  async getConfigSecretByType(type: string) {
    try {
      const url = `${this.baseURL}/config/secret/${type}`;
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

  async uploadFile(nodeId: string, file: File) {
    const url = `${this.baseURL}/supabase-storage/upload/file`; // make sure endpoint exists
    const formData = new FormData();
    formData.append("file", file, file.name);

    const res = await fetch(`${url}?nodeId=${nodeId}`, {
      method: "POST",
      headers: { Authorization: this.token },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Upload failed: ${res.status} - ${err}`);
    }
    return await res.json();
  }

  async deleteFile(nodeId: string, fileName: string) {
    const url = `${this.baseURL}/supabase-storage/delete/file`;
    const res = await fetch(`${url}?nodeId=${nodeId}&fileName=${fileName}`, {
      method: "DELETE",
      headers: { Authorization: this.token },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Delete failed: ${res.status} - ${err}`);
    }
    return await res.json();
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
