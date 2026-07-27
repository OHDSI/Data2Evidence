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

// One OMOP concept the assistant is proposing for a concept set, as handed to the
// `ui_confirm_concepts` tool. Only the id and name are guaranteed — the vocabulary
// fields come from search_concepts and are shown as the row's second line when present.
export interface ConceptSuggestion {
  conceptId: number;
  conceptName: string;
  vocabularyId?: string;
  conceptCode?: string;
  domainId?: string;
}

// An open request for the user to review the concepts the assistant intends to put
// in a concept set (Figma node 1478:110682). The agent's turn is parked on the
// `ui_confirm_concepts` tool call until `selectedIds` is sent back as its output, so
// exactly one of these is unresolved at a time.
export interface ConceptSelection {
  // The tool call this card answers — also the key the selection state is held under.
  toolCallId: string;
  // Name of the concept set to be created, shown as the card's heading.
  name: string;
  // The assistant's lead-in copy ("Here is the list of concepts I will include…").
  intro?: string;
  concepts: ConceptSuggestion[];
  // Concept ids still ticked. Starts as every suggestion; the user unticks the ones
  // they don't want.
  selectedIds: number[];
  // The user has already answered, so the card is a record rather than a prompt.
  resolved: boolean;
}

// A quick-reply chip shown above the composer.
export interface QuickReply {
  id: string;
  label: string;
  selected?: boolean;
  // When set, renders a leading close/"dismiss" glyph instead of a number (e.g. "Neither fits").
  dismiss?: boolean;
  // When set, renders a leading check glyph (e.g. "Approve concept set").
  confirm?: boolean;
  // The chip is shown but cannot be clicked — e.g. "Approve concept set" with nothing
  // left ticked, where the label would promise something it would not do.
  disabled?: boolean;
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
  // Concepts the assistant wants confirmed before it creates the concept set.
  conceptSelection?: ConceptSelection;
}
