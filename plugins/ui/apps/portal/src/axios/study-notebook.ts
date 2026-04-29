import { request } from "./request";

const STUDY_NOTEBOOK_BASE_URL = "system-portal/notebook";

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
  public overwriteAllFromRemote(): Promise<OverwriteAllFromRemoteResponse> {
    return request({
      baseURL: STUDY_NOTEBOOK_BASE_URL,
      url: `/overwrite-all-from-remote`,
      method: "POST",
    });
  }
}
