export type MessageRole = "user" | "assistant";

export interface ToolStatus {
  id: string;
  name: string;
  state: "pending" | "ok" | "error";
  summary?: string;
}

export interface ArtifactEvent {
  kind: string;
  payload: Record<string, unknown>;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  /** Accumulated text content (streams in for assistant messages) */
  content: string;
  toolStatuses: ToolStatus[];
  artifacts: ArtifactEvent[];
  done: boolean;
}

export interface ChatSession {
  sessionId: string;
  datasetId: string;
  createdAt: string;
  expiresInSec: number;
}

export interface StreamCallbacks {
  onToken: (delta: string) => void;
  onToolStart: (id: string, name: string, args: Record<string, unknown>) => void;
  onToolEnd: (id: string, name: string, ok: boolean, summary: string) => void;
  onArtifact: (kind: string, payload: Record<string, unknown>) => void;
  onDone: () => void;
  onError: (message: string) => void;
}
