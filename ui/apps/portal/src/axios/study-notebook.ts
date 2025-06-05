import { StarboardNotebook } from "../plugins/Starboard/utils/notebook";
import { request } from "./request";

const STUDY_NOTEBOOK_BASE_URL = "system-portal/notebook";

export interface RemoteDiffCheckResponse {
  hasDifferences: boolean;
  reason: string;
}

export interface OverwriteFromRemoteResponse {
  message: string;
  overwritten: boolean;
  notebookId: string;
}

export interface OverwriteAllFromRemoteResponse {
  success: boolean;
  message?: string;
  processedCount: number;
  results: Array<{
    notebookId: string;
    name?: string;
    error?: string;
  }>;
}

export class StudyNotebook {
  public getNotebookList(datasetId?: string): Promise<StarboardNotebook[]> {
    const notebookList = request({
      baseURL: STUDY_NOTEBOOK_BASE_URL,
      url: ``,
      method: "GET",
      params: { datasetId },
    });
    return notebookList;
  }

  public createNotebook(datasetId: string, name?: string, notebookContent?: string): Promise<StarboardNotebook> {
    return request({
      baseURL: STUDY_NOTEBOOK_BASE_URL,
      url: ``,
      data: { name, notebookContent, datasetId },
      method: "POST",
    });
  }

  public saveNotebook(
    id: string,
    name: string,
    notebookContent: string,
    isShared: boolean,
    datasetId: string
  ): Promise<StarboardNotebook> {
    return request({
      baseURL: STUDY_NOTEBOOK_BASE_URL,
      url: ``,
      data: {
        id,
        name,
        notebookContent,
        isShared,
        datasetId,
      },
      method: "PUT",
    });
  }

  public deleteNotebook(id: string, datasetId: string): Promise<boolean> {
    return request({
      baseURL: STUDY_NOTEBOOK_BASE_URL,
      url: `/${id}`,
      method: "DELETE",
      params: { datasetId },
    });
  }

  public checkRemoteDiff(id: string, datasetId: string): Promise<RemoteDiffCheckResponse> {
    return request({
      baseURL: STUDY_NOTEBOOK_BASE_URL,
      url: `/${id}/remote-diff-check`,
      method: "GET",
      params: { datasetId },
    });
  }

  public overwriteFromRemote(id: string, datasetId: string): Promise<OverwriteFromRemoteResponse> {
    return request({
      baseURL: STUDY_NOTEBOOK_BASE_URL,
      url: `/${id}/overwrite-from-remote`,
      method: "POST",
      data: { datasetId },
    });
  }

  public overwriteAllFromRemote(): Promise<OverwriteAllFromRemoteResponse> {
    return request({
      baseURL: STUDY_NOTEBOOK_BASE_URL,
      url: `/overwrite-all-from-remote`,
      method: "POST",
    });
  }
}
