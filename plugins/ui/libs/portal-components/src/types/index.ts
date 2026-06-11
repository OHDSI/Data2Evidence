export interface Feedback {
  type?: "error" | "success";
  title?: string;
  message?: string | string[];
  description?: string;
  // Optional inline action (e.g. "Try again") rendered by the Dialog's Alert.
  actionLabel?: string;
  onAction?: () => void;
  autoClose?: number;
}

export interface StudyVersion {
  id: number;
  name: string;
  value: string;
}
