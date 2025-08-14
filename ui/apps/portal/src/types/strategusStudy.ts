export interface StrategusStudy {
  strategus_json: string;
  description?: string;
  email?: string;
  name: string;
  id: string;
  type: StrategusStudyType;
}

export interface NetworkStrategusStudy {
  id: string;
  studyId: string;
  analysisSpec: string;
  notebookName: string;
  mode: string;
}

export enum StrategusStudyType {
  LOCAL = "local",
  NETWORK = "network",
}
