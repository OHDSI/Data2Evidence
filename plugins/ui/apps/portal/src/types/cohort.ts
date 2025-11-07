export interface CohortMapping {
  id: string;
  patientIds: string[];
  patientCount: number;
  name: string;
  description: string;
  creationTimestamp: Date;
  syntax: string;
}
export interface CohortDefinitionList {
  cohortDefinitionCount: number;
  data: CohortMapping[];
}
