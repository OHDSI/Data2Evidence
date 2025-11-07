export interface FeedbackState {
  type?: "error" | "success";
  message?: string;
  description?: string;
  autoClose?: number;
}
