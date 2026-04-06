import { services } from "../env.ts";
import { FileOperationResponse } from "../types.ts";

export class PortalServerAPI {
  private readonly baseURL: string;
  private readonly token: string;
  private readonly channel;

  constructor(token: string) {
    this.token = token;
    if (!token) {
      throw new Error("No token passed for PortalServerAPI!");
    }
    if (services.portalServer) {
      this.baseURL = services.portalServer;
      this.channel = Trex.tokioChannel("d2e-functions/portal");
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
      const result = await this.channel.get(url, options);
      return result.data;
    } catch (error: any) {
      const status = error.status || error.response?.status;
      const responseData = error.response?.data;
      console.error('Error while getting dataset release by id:', error.message, 'status:', status, 'data:', responseData);
      throw error;
    }
  }

  async getDatasetByToken(tokenStudyCode: string) {
    try {
      const url = `${this.baseURL}/dataset/by-token`;
      const queryParams = new URLSearchParams({ tokenDatasetCode: tokenStudyCode });
      const options = this.createOptions("GET");
      const result = await this.channel.get(
        `${url}?${queryParams.toString()}`,
        options
      );
      return result.data;
    } catch (error: any) {
      const status = error.status || error.response?.status;
      const responseData = error.response?.data;
      console.error('Error while getting dataset by token:', error.message, 'status:', status, 'data:', responseData);
      throw error;
    }
  }

  async getDataset(datasetId: string) {
    try {
      const url = `${this.baseURL}/dataset`;
      const queryParams = new URLSearchParams({ datasetId });
      const options = this.createOptions("GET");
      const result = await this.channel.get(
        `${url}?${queryParams.toString()}`,
        options
      );
      return result.data;
    } catch (error: any) {
      const status = error.status || error.response?.status;
      const responseData = error.response?.data;
      console.error('Error while getting dataset by datasetId:', error.message, 'status:', status, 'data:', responseData);
      throw error;
    }
  }

  async getConfigSecretByType(type: string) {
    try {
      const url = `${this.baseURL}/config/secret/${type}`;
      const options = this.createOptions("GET");
      const result = await this.channel.get(url, options);
      return result.data;
    } catch (error: any) {
      const status = error.status || error.response?.status;
      if (status === 404) {
        console.log('Config type not found:', type);
      } else {
        console.error('Error while getting system config:', type, error.message, 'status:', status);
      }
      return null;
    }
  }

  async listFiles(nodeId: string): Promise<any> {
    try {
      const url = `${this.baseURL}/supabase-storage/list/file`;
      const options = this.createOptions("GET");
      const result = await this.channel.get(`${url}?nodeId=${nodeId}`, options);
      return result.data;
    } catch (error: any) {
      const status = error.status || error.response?.status;
      const responseData = error.response?.data;
      console.error('Error while listing files for nodeId:', nodeId, error.message, 'status:', status, 'data:', responseData);
      throw error;
    }
  }

  async uploadFile(nodeId: string, file: File): Promise<FileOperationResponse> {
    try {
      const url = `${this.baseURL}/supabase-storage/upload/file`;
      const formData = new FormData();
      formData.append("file", file, file.name);

      const options = {
        method: "POST",
        headers: {
          Authorization: this.token,
        },
        body: formData,
      };

      // const result = await this.channel.post(
      //   `${url}?nodeId=${nodeId}`,
      //   formData,
      //   options
      // );
      // TODO: Use trex channel after form data issue been resolved
      const result = await fetch(`${url}?nodeId=${nodeId}`, options);
      if (!result.ok) {
        const errorText = await result.text();
        throw new Error(
          `Error while uploading file ${file.name} for nodeId ${nodeId}: ${result.status} - ${errorText}`
        );
      }
      return await result.json();
    } catch (error) {
      console.error('Error while uploading file', file.name, 'for nodeId:', nodeId, error);
      throw error;
    }
  }

  async getFile(nodeId: string, fileName: string): Promise<any> {
    try {
      const url = `${this.baseURL}/supabase-storage/get/file`;
      const options = this.createOptions("GET");
      const result = await this.channel.get(
        `${url}?nodeId=${nodeId}&fileName=${fileName}`,
        options
      );
      return result.data;
    } catch (error: any) {
      const status = error.status || error.response?.status;
      const responseData = error.response?.data;
      console.error('Error while downloading file', fileName, 'for nodeId:', nodeId, error.message, 'status:', status, 'data:', responseData);
      throw error;
    }
  }

  async deleteFile(
    nodeId: string,
    fileName: string
  ): Promise<FileOperationResponse> {
    try {
      const url = `${this.baseURL}/supabase-storage/delete/file`;
      const options = this.createOptions("DELETE");
      const result = await this.channel.delete(
        `${url}?nodeId=${nodeId}&fileName=${fileName}`,
        options
      );
      return result.data;
    } catch (error: any) {
      const status = error.status || error.response?.status;
      const responseData = error.response?.data;
      console.error('Error while deleting file', fileName, 'for nodeId:', nodeId, error.message, 'status:', status, 'data:', responseData);
      throw error;
    }
  }

  async uploadFileToStrategusResults(
    bucket: string,
    path: string,
    file: File
  ): Promise<FileOperationResponse> {
    try {
      const url = `${this.baseURL}/supabase-storage/strategus-results/upload`;
      const formData = new FormData();
      formData.append("file", file, file.name);

      const options = {
        method: "POST",
        headers: {
          Authorization: this.token,
        },
        body: formData,
      };

      // TODO: Use trex channel after form data issue been resolved
      const result = await fetch(
        `${url}?bucket=${bucket}&path=${encodeURIComponent(path)}`,
        options
      );
      if (!result.ok) {
        const errorText = await result.text();
        throw new Error(
          `Error while uploading file ${file.name} to ${bucket}/${path}: ${result.status} - ${errorText}`
        );
      }
      return await result.json();
    } catch (error) {
      console.error('Error while uploading file', file.name, 'to', bucket + '/' + path, error);
      throw error;
    }
  }

  async listFilesFromStrategusResults(
    bucket: string,
    prefix: string
  ): Promise<any> {
    try {
      const url = `${this.baseURL}/supabase-storage/strategus-results/list`;
      const options = this.createOptions("GET");
      const result = await this.channel.get(
        `${url}?bucket=${bucket}&prefix=${encodeURIComponent(prefix)}`,
        options
      );
      return result.data;
    } catch (error: any) {
      const status = error.status || error.response?.status;
      const responseData = error.response?.data;
      console.error('Error while listing files from', bucket, 'with prefix:', prefix, error.message, 'status:', status, 'data:', responseData);
      throw error;
    }
  }

  async getFileFromStrategusResults(
    bucket: string,
    studyId: string,
    fileName: string
  ): Promise<any> {
    try {
      const url = `${this.baseURL}/supabase-storage/strategus-results/download`;
      const options = this.createOptions("GET");
      const path = `${studyId}/${fileName}`;
      const result = await this.channel.get(
        `${url}?bucket=${bucket}&path=${encodeURIComponent(path)}`,
        options
      );
      return result.data;
    } catch (error: any) {
      const status = error.status || error.response?.status;
      const responseData = error.response?.data;
      console.error('Error while downloading file', fileName, 'from', bucket, error.message, 'status:', status, 'data:', responseData);
      throw error;
    }
  }

  async deleteFileFromStrategusResults(
    bucket: string,
    studyId: string,
    fileName: string
  ): Promise<FileOperationResponse> {
    try {
      const url = `${this.baseURL}/supabase-storage/strategus-results/delete`;
      const options = this.createOptions("DELETE");
      const path = `${studyId}/${fileName}`;
      const result = await this.channel.delete(
        `${url}?bucket=${bucket}&path=${encodeURIComponent(path)}`,
        options
      );
      return result.data;
    } catch (error: any) {
      const status = error.status || error.response?.status;
      const responseData = error.response?.data;
      console.error('Error while deleting file', fileName, 'from', bucket + '/' + path, error.message, 'status:', status, 'data:', responseData);
      const err = new Error(
        'Error while deleting file from strategus results'
      ) as Error & { statusCode?: number; cause?: unknown };
      err.statusCode = status;
      err.cause = error;
      throw err;
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
