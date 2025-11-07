export interface StudyDetail {
  id: string;
  name: string;
}

export interface Study {
  id: string;
  studyDetail?: StudyDetail;
}
