// Data model for the D2E AI assistant drawer UI.
// Messages are produced by hooks/useCohortChat from the agent's UI message stream;
// this is the flattened shape the bubble components render.

export type MessageRole = "user" | "assistant";

// One tool call made while producing an assistant message, shown as its own row
// above the reply so the user can see the assistant reading/editing their cohort
// rather than just asserting it did.
export interface ToolActivity {
  id: string;
  name: string;
  state: "running" | "ok" | "error";
  // Call arguments and result, revealed when the row is expanded. Arbitrary JSON:
  // the shape is whatever the tool declares, so it is rendered, not interpreted.
  input?: unknown;
  output?: unknown;
  // Why the call failed, when it did.
  errorText?: string;
}

// A selectable concept-set / disambiguation card rendered inside an assistant message.
export interface MessageOption {
  id: string;
  // Leading number shown in the card (e.g. "1.", "2."). Optional for un-numbered cards.
  index?: number;
  title: string;
  subtitle?: string;
  selected?: boolean;
}

// Structured content for a rich assistant message, mirroring the Figma layout
// (intro paragraph -> bold filter label + bullet list -> question -> option cards -> footer).
export interface AssistantRichContent {
  intro?: string;
  filterLabel?: string;
  filterItems?: string[];
  question?: string;
  options?: MessageOption[];
  footer?: string;
}

// A quick-reply chip shown above the composer.
export interface QuickReply {
  id: string;
  label: string;
  selected?: boolean;
  // When set, renders a leading close/"dismiss" glyph instead of a number (e.g. "Neither fits").
  dismiss?: boolean;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  // Plain text content (newline-separated paragraphs are supported).
  text?: string;
  // Structured content for rich assistant replies.
  rich?: AssistantRichContent;
  // Tools the assistant called while producing this message.
  tools?: ToolActivity[];
}
