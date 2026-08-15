export interface StrategusStudy {
  strategus_json: string;
  description?: string;
  email?: string;
  name: string;
  id: string;
  tokenDatasetCode?: string;
  type: StrategusStudyType;
  viewerCode: string;
}

export interface NetworkStrategusStudy {
  id: string;
  studyId: string;
  analysisId?: string;
  analysisSpec: string;
  notebookName: string;
  mode: string;
  viewerCode?: string;
  createdAt: string;
  updatedAt: string;
  datasetId: string;
  tokenStudyCode: string | null;
}

export enum StrategusStudyType {
  LOCAL = "local",
  NETWORK = "network",
}

export type StrategusResultViewerTemplateData = {
  filename: string;
  content: string;
};
