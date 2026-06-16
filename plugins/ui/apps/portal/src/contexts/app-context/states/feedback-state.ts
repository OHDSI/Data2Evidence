export interface FeedbackState {
  type?: "error" | "success";
  message?: string;
  description?: string;
  autoClose?: number;
  // Opt-in to the new Alert toast (default/undefined renders the legacy Snackbar).
  variant?: "snackbar" | "alert";
  title?: string;
  actionLabel?: string;
  onAction?: () => void;
}
