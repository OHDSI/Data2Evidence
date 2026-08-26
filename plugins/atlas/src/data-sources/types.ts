export type DataSourceAccessState =
  | 'no_access'
  | 'pending'
  | 'restricted'
  | 'read'
  | 'write';

export type DataSourceSort = 'access' | 'name-asc' | 'name-desc';

export interface DataSource {
  id: string;
  tokenDatasetCode: string;
  type?: string;
  dataModel: string;
  totalSubjects?: number;
  accessState?: DataSourceAccessState;
  datasetDetail: {
    id: string;
    name: string;
    description?: string;
    summary?: string;
    showRequestAccess: boolean;
  };
}

export interface DataSourceAccessRequest {
  id: string;
  groupId: string;
}
