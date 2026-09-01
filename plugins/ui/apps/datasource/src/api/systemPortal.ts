import { apiFetch } from './client'

export interface StudyDetail {
  name: string
  description: string
  showRequestAccess: boolean
}

export interface StudyAttributeConfig {
  name: string
  dataType: string
  isDisplayed: string
}

export interface StudyAttribute {
  id: number
  attributeId: string
  value: string
  studyId: string
  attributeConfig: StudyAttributeConfig
}

export interface Dataset {
  id: string
  studyDetail?: StudyDetail
  attributes?: StudyAttribute[]
}

export function getDataset(sourceKey: string, token: string | null): Promise<Dataset> {
  return apiFetch<Dataset>(`/system-portal/dataset?datasetId=${encodeURIComponent(sourceKey)}`, { token })
}

// --- Catalog (overview) additions -------------------------------------------
// The list/catalog screen needs richer fields than the single-dataset detail
// call above. These are additive and do not affect getDataset / the detail page.

export interface DatasetAttribute {
  attributeId: string
  value: string
}

export interface DatasetListItem {
  id: string
  type: string
  visibilityStatus: string
  dataModel: string
  studyDetail?: {
    name?: string
    summary?: string
    description?: string
    showRequestAccess?: boolean
  }
  attributes?: DatasetAttribute[]
}

// The Data Sources overview shows only WebAPI ("webapi") and HANA
// ("hana__omop" / "hana__non_omop") datasets — not source/fhir/study/etc.
export function isOverviewDataset(d: DatasetListItem): boolean {
  return d.type === 'webapi' || d.type.startsWith('hana')
}

function onlyOverviewDatasets(list: DatasetListItem[]): DatasetListItem[] {
  return Array.isArray(list) ? list.filter(isOverviewDataset) : []
}

export async function getDatasetList(token: string | null): Promise<DatasetListItem[]> {
  return onlyOverviewDatasets(await apiFetch<DatasetListItem[]>('/system-portal/dataset/list?role=researcher', { token }))
}

export async function getPublicDatasetList(): Promise<DatasetListItem[]> {
  return onlyOverviewDatasets(await apiFetch<DatasetListItem[]>('/system-portal/dataset/public/list', { token: null }))
}

export interface PublicConfigValue {
  type?: string
  value?: string | null
}

// Admin-configurable banner. These are the same PUBLIC endpoints the d2e portal
// uses (getPublicHeaderImage / getPublicOverviewDescription) — served without
// auth, returning { type, value }. `value` is null until an admin sets it.
export function getPublicHeaderImage(): Promise<PublicConfigValue> {
  return apiFetch<PublicConfigValue>('/system-portal/config/public/header-image', { token: null })
}

export function getPublicOverviewDescription(): Promise<PublicConfigValue> {
  return apiFetch<PublicConfigValue>('/system-portal/config/public/overview-description', { token: null })
}

// --- Resources (files attached to a dataset) --------------------------------

export interface DatasetResource {
  name: string
  size: string
  type: string
}

export async function getResources(datasetId: string, token: string | null): Promise<DatasetResource[]> {
  const response = await apiFetch<{ resources?: DatasetResource[] }>(
    `/system-portal/dataset/resource/list?datasetId=${encodeURIComponent(datasetId)}`,
    { token },
  )
  return response.resources ?? []
}

export interface ResourceDownload {
  data: string
  contentType: string
}

// The backend returns a JSON envelope (base64 data + contentType), not a raw
// binary stream — see plugins/ui/apps/portal/src/utils/downloadResource.ts,
// which this mirrors.
export function downloadResource(datasetId: string, filename: string, token: string | null): Promise<ResourceDownload> {
  return apiFetch<ResourceDownload>(
    `/system-portal/dataset/resource/${encodeURIComponent(filename)}/download?datasetId=${encodeURIComponent(datasetId)}`,
    { token },
  )
}
