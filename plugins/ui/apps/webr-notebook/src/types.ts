export interface PortalProps {
  appId?: string
  getToken?: () => Promise<string>
  username?: string
  idpUserId?: string
  datasetId?: string
  locale?: string
  containerId?: string
}

export interface NotebookRecord {
  id: string
  name: string
  notebookContent: string
  isShared: boolean
  datasetId: string
  userId?: string
}

export interface RemoteDiffCheckResponse {
  hasDifferences: boolean
  reason: string
}

export interface OverwriteFromRemoteResponse {
  message: string
  overwritten: boolean
  notebookId: string
}

export interface NotebookTemplateDto {
  id: string
  name: string
  description: string
  notebookContent: string
}
