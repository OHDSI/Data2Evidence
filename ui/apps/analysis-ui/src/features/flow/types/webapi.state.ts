export interface WebApiCohortDefinitionResultDto {
  id: number;
  name: string;
  description: string | null;
  createdBy: string | null; // Atlas usernames are numbers, but string for d2e
  createdDate: number | null;
  modifiedBy: string | null; // Atlas usernames are numbers, but string for d2e
  modifiedDate: number | null;
  hasWriteAccess: boolean;
  hasReadAccess: boolean;
  tags: string[];
}
