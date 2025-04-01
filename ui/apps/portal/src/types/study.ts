import { Tenant } from "./tenant";

export interface Study {
  id: string;
  tenant: Tenant;
  tokenStudyCode: string;
  schemaName: string;
  vocabSchemaName?: string;
  type: string;
  visibilityStatus: string;
  publicKey: string;
  dataModel: string;
  plugin: string;
  databaseCode: string;
  dialect?: string;
  paConfigId: string;
  studyDetail?: StudyDetail;
  attributes?: StudyAttribute[];
  tags?: StudyTag[];
}

export interface NewStudyInput {
  type: string;
  tokenStudyCode: string;
  tenantId: string;
  schemaOption: string;
  cdmSchemaValue: string;
  vocabSchemaValue?: string;
  cleansedSchemaOption: boolean;
  tenantName?: string;
  dataModel?: string;
  plugin: string;
  databaseCode: string;
  dialect: string;
  paConfigId: string;
  fhirProjectId: string | undefined;
  visibilityStatus: string;
  detail: DatasetDetail;
  dashboards: DatasetDashboard[];
  attributes: {
    attributeId: string;
    value: string;
  }[];
  tags: string[];
}

export interface CopyStudyInput {
  newStudyName: string;
  sourceStudyId: string;
  snapshotLocation: string;
  dataModel: string;
  snapshotCopyConfig?: SnapshotCopyConfig;
}

export interface NewFhirProjectInput {
  name: string;
  description: string;
}

export interface CopyStudyTableMetadata {
  tableName: string;
  tableColumnsMetadata: CopyStudyColumnMetadata[];
  isSelected: boolean;
}

export interface CopyStudyColumnMetadata {
  columnName: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isSelected: boolean;
}

export interface SnapshotCopyConfig {
  timestamp?: string;
  tableConfig?: SnapshotCopyTableConfig[];
  patientsToBeCopied?: string[];
}

export interface SnapshotCopyTableConfig {
  tableName: string;
  columnsToBeCopied: string[];
}

export interface DatasetDetail {
  name: string;
  summary: string;
  description: string;
  showRequestAccess: boolean;
}

export interface StudyDetail {
  id: string;
  name: string;
  summary: string;
  description: string;
  showRequestAccess: boolean;
}

export interface NewStudyDetailInput {
  studyId: string;
  name: string;
  summary: string;
  description: string;
  showRequestAccess: boolean;
}

export interface UpdateStudyDetailInput {
  id: string;
  name: string;
  summary: string;
  description: string;
  showRequestAccess: boolean;
}

export interface StudyMetadata {
  attributeId: string;
  dataType: string;
  id: number;
  studyId: string;
  name: string;
  value: string;
}

export interface StudyAttribute {
  id: number;
  attributeId: string;
  value: string;
  studyId: string;
  attributeConfig: StudyAttributeConfig;
}

export interface StudyAttributeConfig {
  name: string;
  dataType: string;
  isDisplayed: string;
}

export interface StudyTag {
  id: number;
  studyId: string;
  name: string;
}

export interface StudyUserRole {
  role: string;
  granted: "pending" | "approved" | "rejected";
}

export interface StudyUserWithRoles {
  userId: string;
  username: string;
  roles: string[];
}

export interface NewStudyMetadataInput {
  attributeId: string;
  value: string;
}
export interface UpdateStudyMetadataInput {
  id: string;
  detail: DatasetDetail;
  tokenDatasetCode: string;
  type: string;
  visibilityStatus: string;
  paConfigId: string;
  attributes: NewStudyMetadataInput[];
  tags: string[];
  dashboards: DatasetDashboard[];
}

// remove once backend is deprecated
export interface DatasetDashboard {
  name: string;
  url: string;
  basePath: string;
  id?: string;
}

export interface TokenMapping {
  id: number;
  externalId: string;
  token: string | undefined;
  status: string;
  generatedDate: string;
  lastDonationDate: string;
  studyId: string;
  validationDate: string;
}

export interface TokenData {
  tokens: TokenMapping[];
}

export interface GenerateTokenInput {
  externalId: string;
  studyId: string;
}

export interface GenerateMultipleTokenInput {
  externalIds: string[];
  studyId: string;
}

export interface OffboardStudyInput {
  studyId: string;
}

export interface TokenStudyCodes {
  tokenStudyCode: string;
}

export interface StudySystem {
  id: number;
  name: string;
}

export interface DatasetFilter {
  domains: Record<string, string>;
  age: { min: number; max: number };
  observationYear: { min: number; max: number };
  cumulativeObservationMonths: { min: number; max: number };
}

export interface DatasetResource {
  name: string;
  size: string;
  type: string;
}

export interface SchemasVersionInformation {
  schemaName: string;
  dataModel: string;
  currentVersionID: string;
  updatesAvailable: boolean;
}

export interface UpdateSchemaInput {
  schemaName: string;
  dataModel: string;
  databaseCode: string;
  dialect: string;
  vocabSchemaValue: string;
  plugin: string;
}

interface FailedSchemas {
  schemaName: string;
}

export interface SchemasVersionInfoResponse {
  message: string;
  successfulSchemas: SchemasVersionInformation[];
  failedSchemas: FailedSchemas[];
  errorOccured: boolean;
}

export type DatasetQueryRole = "researcher" | "systemAdmin";

export interface CreateHanaReleaseInput {
  name: string;
  releaseDate: string;
  datasetId: string;
}

export interface DatasetTagConfig {
  name: string;
}
export interface DatasetAttributeConfig {
  id: string;
  name: string;
  category: string;
  dataType: string;
  isDisplayed: boolean;
}
