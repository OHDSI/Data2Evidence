import {
  ATTRIBUTE_CONFIG_CATEGORIES,
  ATTRIBUTE_CONFIG_DATA_TYPES,
  CDM_SCHEMA_OPTIONS,
  DATABASE_DIALECTS,
  DATASET_QUERY_ROLES,
  PA_CONFIG_TYPE,
  VISIBILITY_STATUS
} from './common/const.ts'

export interface ITenant {
  id: string
  name: string
  system: string
  features?: string[]
}

export type DatabaseDialect = (typeof DATABASE_DIALECTS)[number]

export interface IDataset {
  id: string
  type?: string
  paConfigId: string
  tokenStudyCode: string
  dialect: DatabaseDialect
  databaseCode: string
  schemaName?: string
  vocabSchemaName?: string
  dataModel?: string
  studyDetail: {
    id: string
    name: string
    description: string
  }
  tenant?: ITenant
  fhir_project_id?: string
}

// TODO: Remove when we switch from study to dataset entirely
interface IStudyDto {
  id: string
  type?: string
  tokenStudyCode: string
  tenantId: string
  databaseName?: string
  schemaName?: string
  vocabSchemaName?: string
  dataModel?: string
  paConfigId: string
}

export interface IDatasetDto {
  id: string
  type?: string
  tokenDatasetCode: string
  tenantId: string
  databaseCode: string
  schemaName: string
  vocabSchemaName: string
  dataModel: string
  paConfigId: string
  detail: IDatasetDetailBaseDto
  dashboards: IDatasetDashboardBaseDto[]
  attributes: IDatasetAttribute[]
  tags: string[]
  fhir_project_id?: string
}

export interface IDatasetSnapshotDto {
  id: string
  sourceDatasetId: string
  newDatasetName: string
  schemaName: string
  timestamp: Date
}

interface IDatasetDetailBaseDto {
  name: string
  summary: string
  description: string
  showRequestAccess: boolean
}

// TODO: Remove when we switch from study to dataset entirely
export interface IStudyDetailDto extends IDatasetDetailBaseDto {
  studyId: string
}

interface IDatasetDashboardBaseDto {
  name: string
  url: string
  basePath: string
}

interface IDatasetTag {
  id: number
  name: string
}

interface IDatasetAttribute {
  attributeId: string
  value: string
}

export interface IDatasetAttributeDto extends IDatasetAttribute {
  studyId: string
}

export type VisibilityStatus = (typeof VISIBILITY_STATUS)[number]

export type CdmSchemaOption = (typeof CDM_SCHEMA_OPTIONS)[number]
// export type CdmSchemaOption = string
// export interface CdmSchemaOption extends String {}

export interface IDatasetDetailMetadataUpdateDto {
  id: string
  detail: IDatasetDetailBaseDto
  dashboards: IDatasetDashboardBaseDto[]
  attributes: IDatasetAttribute[]
  tags: string[]
  type?: string
  tokenDatasetCode: string
  visibilityStatus: string
  paConfigId: string
  fhir_project_id?: string
}

export interface IDatasetMetadataUpdateDto {
  id: string
  studyAttributes: IDatasetAttribute[]
  studyTags: string[]
  type?: string
  tokenStudyCode: string
  visibilityStatus: string
  paConfigId: string
}

export interface IDatasetTagDto {
  id: string
  studyId: string
  name: string
}

export interface IDatasetResponseDto {
  id: string
  tenant: {
    id: string
    name: string
  }
  tokenDatasetCode: string
  type?: string
  datasetDetail: {
    id: string
    name: string
    description?: string
    summary?: string
    showRequestAccess: boolean
  }
  // @deprecated: all dependency should switch to use of `databaseCode`before removal on 16 February 2024
  databaseName?: string
  databaseCode?: string
  schemaName?: string
  dashboards: IDatasetDashboardBaseDto[]
  attributes: IDatasetAttribute[]
  tags: IDatasetTag[]
  totalSubjects?: number
  dataModel: string
  plugin: string
  fhir_project_id?: string
}

export interface IDatasetSearchDto {
  tokenDatasetCode: string
}

export type IPublicDatasetQueryDto = IDatasetSearchFilterDto

export type DatasetQueryRole = (typeof DATASET_QUERY_ROLES)[number]

export interface IDatasetQueryDto extends IDatasetSearchFilterDto, IDatasetFilterParamsDto {
  role?: DatasetQueryRole
}
export interface IDatasetSearchFilterDto {
  searchText?: string
}
export interface IDatasetFilterParamsDto {
  age?: {
    gte: number
    lte: number
  }
  observationYear?: {
    gte: number
    lte: number
  }
}

export interface IDatasetFilterScopesResult {
  domains: { [key: string]: string }
  age: MinMaxRange
  observationYear: MinMaxRange
  cumulativeObservationMonths: MinMaxRange
}

export interface IDatabaseSchemaFilterResult {
  [key: string]: string
}

interface INotebookBaseDto {
  name: string
  notebookContent: string
}

export interface INotebookUpdateDto extends INotebookBaseDto {
  id: string
  isShared: boolean
}

export interface INotebook extends INotebookBaseDto {
  id: string
  userId: string
}

interface MinMaxRange {
  min: number
  max: number
}

export interface ISwiftObject {
  name: string
  hash: string
  bytes: number
  content_type: string
  last_modified: Date
}

export interface ISystemNameDto {
  systemName: string
}

interface IDatasetReleaseDto {
  name: string
  datasetId: string
  releaseDate: Date
}

interface IPortalPlugin {
  name: string
  featureFlag?: string
  enabled?: string
  children?: IPortalPlugin[]
}

export interface PaConfig {
  meta: {
    configId: string
    configName: string
  }
}

export type PaConfigType = `${PA_CONFIG_TYPE}`
export interface IMetadataConfigTag {
  name: string
}

export interface IMetadataConfigAttribute {
  id: string
  name: string
  category: ATTRIBUTE_CONFIG_CATEGORIES
  dataType: ATTRIBUTE_CONFIG_DATA_TYPES
  isDisplayed: boolean
}
export interface IFeatureDto {
  feature: string
  isEnabled: boolean
}

export interface IFeatureUpdateDto {
  features: IFeatureDto[]
}

export interface UserGroup {
  userId: string
  alp_role_study_researcher: string[]
}

export interface IConfig {
  type: string
  value: string
}
export interface IConfigUpdateDto {
  type: string
  value: string
}

interface StudyMetadata {
  strategus_json: string
  description?: string
  email?: string
}

export interface StudiesData {
  [studyId: string]: StudyMetadata
}

export interface GitSubmodule {
  name: string;
  path: string;
  url: string;
  branch?: string;
}

export interface PartialGitSubmodule {
  name?: string;
  path?: string;
  url?: string;
  branch?: string;
}
