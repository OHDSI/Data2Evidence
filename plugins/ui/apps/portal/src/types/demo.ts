export interface IProgressResponse {
  status: "inprogress" | "completed" | "failed";
  steps: { step: number; message: string; status: "inprogress" | "completed" | "failed" }[];
}

export interface ISetupResponse {
  id: string;
  message: string;
}
