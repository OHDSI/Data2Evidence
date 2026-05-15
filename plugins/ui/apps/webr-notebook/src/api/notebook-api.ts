import { request } from './request'
import type {
  NotebookRecord,
  RemoteDiffCheckResponse,
  OverwriteFromRemoteResponse,
  NotebookTemplateDto,
} from '../types'

export async function getNotebookList(datasetId: string): Promise<NotebookRecord[]> {
  const response = await request.get<NotebookRecord[]>('', {
    params: { datasetId },
  })
  return response.data
}

export async function createNotebook(
  datasetId: string,
  name: string,
  content: string
): Promise<NotebookRecord> {
  const response = await request.post<NotebookRecord>('', {
    name,
    notebookContent: content,
    datasetId,
  })
  return response.data
}

export async function saveNotebook(
  id: string,
  name: string,
  content: string,
  isShared: boolean,
  datasetId: string
): Promise<NotebookRecord> {
  const response = await request.put<NotebookRecord>('', {
    id,
    name,
    notebookContent: content,
    isShared,
    datasetId,
  })
  return response.data
}

export async function deleteNotebook(id: string, datasetId: string): Promise<void> {
  await request.delete(`/${id}`, {
    params: { datasetId },
  })
}

export async function checkRemoteDiff(
  id: string,
  datasetId: string
): Promise<RemoteDiffCheckResponse> {
  const response = await request.get<RemoteDiffCheckResponse>(
    `/${id}/remote-diff-check`,
    { params: { datasetId } }
  )
  return response.data
}

export async function overwriteFromRemote(
  id: string,
  datasetId: string
): Promise<OverwriteFromRemoteResponse> {
  const response = await request.post<OverwriteFromRemoteResponse>(
    `/${id}/overwrite-from-remote`,
    { datasetId }
  )
  return response.data
}

export async function getTemplates(
  datasetId: string
): Promise<NotebookTemplateDto[]> {
  const response = await request.get<NotebookTemplateDto[]>('/templates', {
    params: { datasetId },
  })
  return response.data
}

export async function createNotebookFromTemplate(
  templateId: string,
  name: string,
  datasetId: string
): Promise<NotebookRecord> {
  const response = await request.post<NotebookRecord>(
    `/templates/${templateId}`,
    { name, datasetId }
  )
  return response.data
}
