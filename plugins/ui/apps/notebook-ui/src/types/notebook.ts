export interface StarboardNotebook {
  id: string;
  name: string;
  notebookContent: string;
  isShared: boolean;
  datasetId: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

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

export interface NotebookTemplateDto {
  id: string;
  name: string;
  description: string;
  notebookContent: string;
}
