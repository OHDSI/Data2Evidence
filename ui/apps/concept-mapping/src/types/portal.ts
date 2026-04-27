export interface StudyDetail {
  id: string;
  name: string;
}

export interface Study {
  id: string;
  databaseCode: string;
  schemaName: string;
  studyDetail?: StudyDetail;
}
