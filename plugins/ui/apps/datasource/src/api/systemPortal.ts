import { apiFetch } from './client'

export interface StudyDetail {
  name: string
  description: string
  showRequestAccess: boolean
}

export interface Dataset {
  id: string
  studyDetail?: StudyDetail
}

export function getDataset(sourceKey: string, token: string | null): Promise<Dataset> {
  return apiFetch<Dataset>(`/system-portal/dataset?datasetId=${encodeURIComponent(sourceKey)}`, { token })
}
