export interface Feedback {
  type?: "error" | "success";
  message?: string | string[];
  description?: string;
  autoClose?: number;
}

export interface StudyVersion {
  id: number;
  name: string;
  value: string;
}
