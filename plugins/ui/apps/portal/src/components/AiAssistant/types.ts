// Data model for the D2E AI assistant drawer UI.
// This is a UI-only proof of concept: messages are held in local component state and
// assistant replies are canned. Wiring to the LLM / MCP / WebMCP tools comes later.

export type MessageRole = "user" | "assistant";

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
}
