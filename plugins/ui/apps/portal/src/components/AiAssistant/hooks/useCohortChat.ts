import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  UIMessage,
  getToolOrDynamicToolName,
  isTextUIPart,
  isToolUIPart,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { getAuthToken } from "../../../containers/auth/auth";
import { useActiveDataset, useTranslation } from "../../../contexts";
import { callPaTool } from "../webmcp/paToolBridge";
import { usePaTools } from "../webmcp/usePaTools";
import {
  AssistantRichContent,
  ChatMessage,
  ConceptSelection,
  ConceptSetChoice,
  ConceptSetOption,
  ConceptSuggestion,
  ToolActivity,
} from "../types";

// Relative on purpose: the portal is served under <base href="/d2e/portal">, so a
// base-relative path resolves to /d2e/code-suggestion/agent — the same convention
// every other portal API call uses (see axios/request.ts baseURLs).
const AGENT_API = "code-suggestion/agent";

// The browser-side tool the agent calls to have a concept list confirmed before it
// creates the concept set. Declared server-side with no executor (see
// code-suggestion/src/agent/cohortAgent.ts), so the SDK streams the call here and
// the turn stays parked until the user answers — that pause IS the review step.
export const CONFIRM_CONCEPTS_TOOL = "ui_confirm_concepts";

// Its counterpart for reuse: "you already have two Alzheimer's concept sets — which
// did you mean?". Declared server-side without an executor for the same reason, so
// the turn parks here until the user picks one instead of the agent creating a
// third set nobody asked for.
export const CHOOSE_CONCEPT_SET_TOOL = "ui_choose_concept_set";

// Choice tokens carried in a card/chip id. The tool call id travels with them so a
// click on an old card in the transcript cannot answer the current question.
const CHOICE_ALL = "all";
const CHOICE_NONE = "none";
const CHOICE_SELECTED = "selected";
const CHOICE_SET_PREFIX = "cs:";

export const conceptSetChoiceId = (toolCallId: string, token: string): string => `${toolCallId}|${token}`;

export const conceptSetOptionId = (toolCallId: string, conceptSetId: number): string =>
  conceptSetChoiceId(toolCallId, `${CHOICE_SET_PREFIX}${conceptSetId}`);

export const conceptSetAllId = (toolCallId: string): string => conceptSetChoiceId(toolCallId, CHOICE_ALL);

export const conceptSetNoneId = (toolCallId: string): string => conceptSetChoiceId(toolCallId, CHOICE_NONE);

/** The "use what I ticked" chip, which is the only way to send a subset. */
export const conceptSetSelectedId = (toolCallId: string): string => conceptSetChoiceId(toolCallId, CHOICE_SELECTED);

// lastIndexOf, not split: only the token side is guaranteed free of "|".
const parseChoiceId = (id: string): { toolCallId: string; token: string } | undefined => {
  const separator = id.lastIndexOf("|");
  if (separator < 0) return undefined;
  return { toolCallId: id.slice(0, separator), token: id.slice(separator + 1) };
};

// Wording the flattening step needs but cannot reach useTranslation for.
export interface ChatLabels {
  conceptSetFallbackName: string;
  includeAll: (count: number) => string;
}

export interface CohortChatState {
  messages: ChatMessage[];
  sendMessage: (text: string) => void;
  reset: () => void;
  isStreaming: boolean;
  /** Live PA cohort editing is possible right now. */
  liveEditing: boolean;
  /** PA is open but on a different dataset than the portal's active one. */
  datasetMismatch: boolean;
  /** No dataset selected — the agent has nothing to scope its tools to. */
  datasetMissing: boolean;
  /**
   * The concept list waiting on the user, when the agent has asked for one. The
   * turn cannot proceed until it is answered, so the drawer parks the composer and
   * offers the approve/reject chips instead.
   */
  pendingConceptSelection?: ConceptSelection;
  /** Tick or untick one concept in the pending list. */
  toggleConcept: (toolCallId: string, conceptId: number) => void;
  /** Answer the pending request: send the ticked concepts back to the agent. */
  submitConceptSelection: (approved: boolean) => void;
  /**
   * The existing-concept-set question waiting on the user, when the agent has asked
   * one. Like the concept review it parks the turn until answered.
   */
  pendingConceptSetChoice?: ConceptSetChoice;
  /**
   * Tick or untick one candidate. The "include all" card id toggles the whole set.
   * Card clicks accumulate here rather than answering, so a subset can be built up.
   */
  toggleConceptSetOption: (optionId: string) => void;
  /**
   * Answer it. Takes the id of the chip that was clicked — see `conceptSetOptionId`
   * (just that one), `conceptSetAllId`, `conceptSetSelectedId` (what is ticked) and
   * `conceptSetNoneId` (none of them fit).
   */
  submitConceptSetChoice: (optionId: string) => void;
  error?: Error;
}

// Tool part states from the AI SDK, collapsed to what the tool row shows. The
// input/output travel with it so the row can be expanded into the actual call —
// "it edited my cohort" is worth being able to check.
function toToolActivity(part: any): ToolActivity {
  const base = { id: part.toolCallId, name: getToolOrDynamicToolName(part), input: part.input };
  if (part.state === "output-error") return { ...base, state: "error", errorText: part.errorText };
  if (part.state === "output-available") return { ...base, state: "ok", output: part.output };
  return { ...base, state: "running" };
}

// The concept list arrives as model-authored tool input, so nothing about its shape
// is guaranteed. Drop anything without a usable id + name rather than rendering a
// row the user cannot meaningfully judge — and never coerce a missing id to 0,
// which would put the wrong concept in the set.
function toConceptSuggestions(input: unknown): ConceptSuggestion[] {
  const raw = (input as any)?.concepts;
  if (!Array.isArray(raw)) return [];
  const seen = new Set<number>();
  const concepts: ConceptSuggestion[] = [];
  for (const item of raw) {
    const conceptId = Number(item?.conceptId);
    const conceptName = typeof item?.conceptName === "string" ? item.conceptName.trim() : "";
    // Duplicates would collide on the React key and on the toggle, so the second
    // copy of a concept would silently un-tick the first.
    if (!Number.isFinite(conceptId) || !conceptName || seen.has(conceptId)) continue;
    seen.add(conceptId);
    concepts.push({
      conceptId,
      conceptName,
      vocabularyId: typeof item?.vocabularyId === "string" ? item.vocabularyId : undefined,
      conceptCode: item?.conceptCode != null ? String(item.conceptCode) : undefined,
      domainId: typeof item?.domainId === "string" ? item.domainId : undefined,
    });
  }
  return concepts;
}

// A `ui_confirm_concepts` call, as the card that answers it. `selectedIds` is the
// user's edit when they have made one, and every suggested concept until then.
function toConceptSelection(part: any, edits: Record<string, number[]>, fallbackName: string): ConceptSelection {
  const concepts = toConceptSuggestions(part.input);
  const name = typeof part.input?.conceptSetName === "string" ? part.input.conceptSetName.trim() : "";
  const intro = typeof part.input?.intro === "string" ? part.input.intro.trim() : undefined;
  const edited = edits[part.toolCallId];
  const conceptIds = concepts.map((concept) => concept.conceptId);
  return {
    toolCallId: part.toolCallId,
    name: name || fallbackName,
    intro: intro || undefined,
    concepts,
    // An edit made before the model revised its list could name concepts that are
    // no longer offered, so intersect rather than trusting the stored ids.
    selectedIds: edited ? conceptIds.filter((id) => edited.includes(id)) : conceptIds,
    resolved: part.state !== "input-available" && part.state !== "input-streaming",
  };
}

// Same contract as toConceptSuggestions: model-authored input, so drop any option
// without a usable id + name rather than rendering a card that cannot be answered.
function toConceptSetOptions(input: unknown): ConceptSetOption[] {
  const raw = (input as any)?.options;
  if (!Array.isArray(raw)) return [];
  const seen = new Set<number>();
  const options: ConceptSetOption[] = [];
  for (const item of raw) {
    const conceptSetId = Number(item?.conceptSetId);
    const name = typeof item?.name === "string" ? item.name.trim() : "";
    if (!Number.isFinite(conceptSetId) || !name || seen.has(conceptSetId)) continue;
    seen.add(conceptSetId);
    const note = typeof item?.note === "string" ? item.note.trim() : "";
    const shortLabel = typeof item?.shortLabel === "string" ? item.shortLabel.trim() : "";
    options.push({ conceptSetId, name, note: note || undefined, shortLabel: shortLabel || undefined });
  }
  return options;
}

const trimmedString = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
};

/**
 * A `ui_choose_concept_set` call, as the card that answers it (Figma node 1475:126506).
 *
 * While the question is open `picks` holds what the user has ticked; once answered
 * the selection is read back off the tool output, so a resolved card in the
 * transcript shows what was actually sent rather than local state that could have
 * moved on.
 *
 * The panel — not the model — appends the "include all" choice, so the numbering the
 * user sees always matches the options that actually exist.
 */
function toConceptSetChoice(
  part: any,
  picks: Record<string, number[]>,
  labels: ChatLabels
): { choice: ConceptSetChoice; rich: AssistantRichContent } {
  const options = toConceptSetOptions(part.input);
  const resolved = part.state !== "input-available" && part.state !== "input-streaming";
  const output = part.output as { chosen?: boolean; conceptSetIds?: unknown } | undefined;
  const answered = Array.isArray(output?.conceptSetIds)
    ? output!.conceptSetIds.map(Number).filter((id: number) => Number.isFinite(id))
    : [];

  // A tick made before the model revised its options could name a set no longer
  // offered, so intersect rather than trusting the stored ids.
  const optionIds = options.map((option) => option.conceptSetId);
  const ticked = (picks[part.toolCallId] ?? []).filter((id) => optionIds.includes(id));
  const selectedIds = resolved ? answered : ticked;
  const rejected = resolved && answered.length === 0;

  const filterItems = Array.isArray(part.input?.filterItems)
    ? part.input.filterItems.map(trimmedString).filter((item: string | undefined): item is string => Boolean(item))
    : undefined;

  const cards = options.map((option, index) => ({
    id: conceptSetOptionId(part.toolCallId, option.conceptSetId),
    index: index + 1,
    title: option.name,
    subtitle: option.note,
    selected: selectedIds.includes(option.conceptSetId),
    disabled: resolved,
  }));

  // With a single candidate there is nothing to combine, and "include all" over one
  // card is just a second way to press the same button.
  if (options.length > 1) {
    cards.push({
      id: conceptSetAllId(part.toolCallId),
      index: options.length + 1,
      title: labels.includeAll(options.length),
      subtitle: undefined,
      selected: selectedIds.length === options.length,
      disabled: resolved,
    });
  }

  return {
    choice: {
      toolCallId: part.toolCallId,
      term: trimmedString(part.input?.term) ?? "",
      options,
      selectedIds,
      rejected,
      resolved,
    },
    rich: {
      intro: trimmedString(part.input?.intro),
      filterLabel: trimmedString(part.input?.filterLabel),
      filterItems: filterItems?.length ? filterItems : undefined,
      question: trimmedString(part.input?.question),
      options: cards,
      footer: trimmedString(part.input?.footer),
    },
  };
}

/**
 * The drawer renders its own bubble model; flatten one UIMessage's parts into it.
 *
 * Usually that is one bubble, but a concept review SPLITS the turn. Answering the
 * card resumes the same UIMessage, so the reply the user gets back — "your cohort
 * has been created" — is another text part on the message that asked the question.
 * Concatenating every text part would print that answer above the question that
 * produced it. So the card closes a bubble: text before it belongs with it, and
 * anything after it starts a new bubble underneath, which is also how the exchange
 * actually went.
 *
 * Tool rows follow the same order, so a tool called after the review is attributed
 * to the bubble it produced rather than to the one before it.
 */
function toChatMessages(
  message: UIMessage,
  edits: Record<string, number[]>,
  picks: Record<string, number[]>,
  labels: ChatLabels
): ChatMessage[] {
  const role = message.role === "user" ? "user" : "assistant";
  const bubbles: ChatMessage[] = [];
  let text = "";
  let tools: ToolActivity[] = [];

  const flush = (card?: Pick<ChatMessage, "rich" | "conceptSelection" | "conceptSetChoice">) => {
    // An assistant turn opens with an empty message and fills in as it streams;
    // until something lands there is nothing to show.
    if (!text && tools.length === 0 && !card) return;
    // Index-suffixed so the key is stable as the turn streams: earlier bubbles keep
    // their position, and only the one being written to changes.
    bubbles.push({ id: `${message.id}:${bubbles.length}`, role, text, tools, ...card });
    text = "";
    tools = [];
  };

  for (const part of message.parts) {
    if (isTextUIPart(part)) {
      text += part.text;
    } else if (isToolUIPart(part)) {
      // Both panel tools are rendered as their own interactive card, so keep them out
      // of the tool rows — a "Ran ui_confirm_concepts" line above its own card is noise.
      const toolName = getToolOrDynamicToolName(part);
      if (toolName === CONFIRM_CONCEPTS_TOOL) {
        flush({ conceptSelection: toConceptSelection(part, edits, labels.conceptSetFallbackName) });
      } else if (toolName === CHOOSE_CONCEPT_SET_TOOL) {
        const { choice, rich } = toConceptSetChoice(part, picks, labels);
        // A card with nothing to choose between cannot be answered, and parking the
        // composer behind it would strand the conversation.
        if (choice.options.length > 0) flush({ rich, conceptSetChoice: choice });
      } else {
        tools.push(toToolActivity(part));
      }
    }
  }
  flush();

  return bubbles;
}

/**
 * Chat state for the AI assistant drawer, wired to the cohort agent.
 *
 * The agent loop runs on the server (credentials stay there), but the `pa_*`
 * tools run HERE: the server declares them without an executor, the SDK streams
 * the call to us, `onToolCall` runs it against the live Patient Analytics store,
 * and `sendAutomaticallyWhen` resubmits so the model can carry on with the
 * result. That round trip is what lets the assistant edit the cohort on screen
 * instead of handing back a link.
 *
 * `ui_confirm_concepts` rides the same mechanism for the opposite reason: it is
 * declared without an executor so the turn stops here, and this hook deliberately
 * does NOT answer it. It stays open until the user picks their concepts, and their
 * answer is the tool output that lets the model continue.
 */
export function useCohortChat(): CohortChatState {
  const { activeDataset } = useActiveDataset();
  const { available, datasetMismatch, tools } = usePaTools();
  const { getText, i18nKeys } = useTranslation();

  // The user's edits to the proposed concept lists, keyed by tool call. Held here
  // rather than in the card so the approve chip — which lives down in the composer,
  // outside the conversation — sends what the user actually ticked.
  const [conceptEdits, setConceptEdits] = useState<Record<string, number[]>>({});

  // The candidate sets ticked on each open `ui_choose_concept_set` card, keyed the
  // same way. Held here for the same reason: the chip that sends them lives in the
  // composer, outside the conversation.
  const [conceptSetPicks, setConceptSetPicks] = useState<Record<string, number[]>>({});

  // The transport is built once, but reads dataset/tools per request: both change
  // as the user navigates, and a transport rebuilt mid-conversation would drop
  // the in-flight chat.
  const datasetIdRef = useRef<string | undefined>(activeDataset?.id);
  const paToolsRef = useRef(tools);
  useEffect(() => {
    datasetIdRef.current = activeDataset?.id;
  }, [activeDataset?.id]);
  useEffect(() => {
    paToolsRef.current = tools;
  }, [tools]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport<UIMessage>({
        api: AGENT_API,
        prepareSendMessagesRequest: async ({ messages, api }) => {
          const token = await getAuthToken(false);
          const headers: Record<string, string> = {};
          if (token) headers.Authorization = `Bearer ${token}`;
          return {
            api: `${api}?datasetId=${encodeURIComponent(datasetIdRef.current ?? "")}`,
            // Content-Type is deliberately NOT set here. The transport already adds
            // it and then spreads these headers over its own object, so a
            // lowercase "content-type" survives alongside its "Content-Type";
            // Headers() appends rather than replaces, and the request goes out as
            // "application/json, application/json" — which express.json() does not
            // recognise, leaving the server with an empty body.
            headers,
            // paTools is re-read every turn: PA may have mounted (or gone) since
            // the previous message, and the prompt is built from what we send.
            body: { messages, paTools: paToolsRef.current },
          };
        },
      }),
    []
  );

  // onToolCall is defined before useChat returns addToolOutput, so it goes
  // through a ref.
  const addToolOutputRef = useRef<((args: any) => void) | null>(null);

  const chat = useChat<UIMessage>({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onToolCall: async ({ toolCall }) => {
      const { toolCallId } = toolCall;
      const toolName = (toolCall as any).toolName as string;

      // The concept review is answered by the user, not by code. Returning without
      // adding output is what leaves the call in `input-available` — the state the
      // card renders from — so the turn waits instead of racing ahead.
      if (toolName === CONFIRM_CONCEPTS_TOOL) return;

      // Same for the reuse question — unless the model asked it with nothing to
      // choose between. That card cannot be rendered, so leaving the call open would
      // park the turn on a question the user never sees; answer it instead, and say
      // why, so the model falls through to building a set.
      if (toolName === CHOOSE_CONCEPT_SET_TOOL) {
        if (toConceptSetOptions((toolCall as any).input).length > 0) return;
        addToolOutputRef.current?.({
          tool: toolName,
          toolCallId,
          output: {
            chosen: false,
            conceptSetIds: [],
            conceptSetNames: [],
            note:
              "No usable options were supplied, so nothing was shown to the user. Each option needs a " +
              "numeric conceptSetId from list_concept_sets and a name. Either re-ask with valid options, " +
              "or build a new concept set.",
          },
        });
        return;
      }

      // Only the browser tools are ours to run. Anything else reaching here means
      // the server declared a tool it cannot execute — fail it loudly rather than
      // hanging the turn waiting for output that will never come.
      if (!toolName?.startsWith("pa_")) {
        addToolOutputRef.current?.({
          tool: toolName,
          toolCallId,
          state: "output-error",
          errorText: `"${toolName}" is not a browser tool and cannot be executed by the assistant UI.`,
        });
        return;
      }

      // callPaTool never rejects — it returns an actionable error payload the
      // model can recover from (e.g. "Patient Analytics is not open").
      const output = await callPaTool(toolName, (toolCall as any).input ?? {});
      // Deliberately not awaited: awaiting here would deadlock against the
      // automatic resubmit this call triggers.
      addToolOutputRef.current?.({ tool: toolName, toolCallId, output });
    },
    onError: (error) => {
      console.error("[AiAssistant] agent error", error);
    },
  });

  addToolOutputRef.current = chat.addToolOutput as any;

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !datasetIdRef.current) return;
      chat.sendMessage({ text: trimmed });
    },
    [chat]
  );

  const reset = useCallback(() => {
    chat.setMessages([]);
    chat.clearError();
    setConceptEdits({});
    setConceptSetPicks({});
  }, [chat]);

  const labels = useMemo<ChatLabels>(
    () => ({
      conceptSetFallbackName: getText(i18nKeys.AI_ASSISTANT__CONCEPTS_SET_FALLBACK_NAME),
      includeAll: (count: number) =>
        count === 2
          ? getText(i18nKeys.AI_ASSISTANT__CONCEPT_SET_INCLUDE_BOTH)
          : getText(i18nKeys.AI_ASSISTANT__CONCEPT_SET_INCLUDE_ALL, [String(count)]),
    }),
    [getText, i18nKeys]
  );

  const messages = useMemo(
    () => chat.messages.flatMap((message) => toChatMessages(message, conceptEdits, conceptSetPicks, labels)),
    [chat.messages, conceptEdits, conceptSetPicks, labels]
  );

  // Only the newest unanswered request is live. Earlier cards in the transcript are
  // already resolved, and a second open one cannot exist — the turn stops at the
  // first unanswered tool call.
  const pendingConceptSelection = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const selection = messages[index].conceptSelection;
      if (selection && !selection.resolved) return selection;
    }
    return undefined;
  }, [messages]);

  const pendingConceptSetChoice = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const choice = messages[index].conceptSetChoice;
      if (choice && !choice.resolved) return choice;
    }
    return undefined;
  }, [messages]);

  const toggleConceptSetOption = useCallback(
    (optionId: string) => {
      const choice = pendingConceptSetChoice;
      if (!choice) return;
      const parsed = parseChoiceId(optionId);
      // A click on a card further up the transcript belongs to a question that has
      // already been answered — it must not disturb the live one.
      if (!parsed || parsed.toolCallId !== choice.toolCallId) return;

      const optionIds = choice.options.map((option) => option.conceptSetId);
      let next: number[];
      if (parsed.token === CHOICE_ALL) {
        // Select-all, and a way back out of it — otherwise ticking "include all" by
        // mistake can only be undone by unticking every card one at a time.
        next = choice.selectedIds.length === optionIds.length ? [] : optionIds;
      } else {
        const conceptSetId = Number(parsed.token.slice(CHOICE_SET_PREFIX.length));
        if (!optionIds.includes(conceptSetId)) return;
        next = choice.selectedIds.includes(conceptSetId)
          ? choice.selectedIds.filter((id) => id !== conceptSetId)
          : [...choice.selectedIds, conceptSetId];
      }
      setConceptSetPicks((previous) => ({ ...previous, [choice.toolCallId]: next }));
    },
    [pendingConceptSetChoice]
  );

  const submitConceptSetChoice = useCallback(
    (optionId: string) => {
      const choice = pendingConceptSetChoice;
      if (!choice) return;
      const parsed = parseChoiceId(optionId);
      if (!parsed || parsed.toolCallId !== choice.toolCallId) return;

      let picked: ConceptSetOption[];
      if (parsed.token === CHOICE_NONE) {
        picked = [];
      } else if (parsed.token === CHOICE_ALL) {
        picked = choice.options;
      } else if (parsed.token === CHOICE_SELECTED) {
        picked = choice.options.filter((option) => choice.selectedIds.includes(option.conceptSetId));
        // Sending an empty tick list would read to the model as "none of these fit",
        // which is a different answer than "I have not picked yet".
        if (picked.length === 0) return;
      } else {
        const conceptSetId = Number(parsed.token.slice(CHOICE_SET_PREFIX.length));
        picked = choice.options.filter((option) => option.conceptSetId === conceptSetId);
        // An id that matches no option would otherwise send `chosen: false` and read
        // to the model as the user rejecting every set.
        if (picked.length === 0) return;
      }

      const chosen = picked.length > 0;
      const names = picked.map((option) => option.name);
      addToolOutputRef.current?.({
        tool: CHOOSE_CONCEPT_SET_TOOL,
        toolCallId: choice.toolCallId,
        output: {
          chosen,
          conceptSetIds: picked.map((option) => option.conceptSetId),
          conceptSetNames: names,
          note: chosen
            ? `The user chose ${names.join(" and ")}. Use ${
                picked.length > 1 ? "these existing concept sets" : "this existing concept set"
              } — do not create a new one${choice.term ? ` for "${choice.term}"` : ""}.`
            : `None of the existing concept sets fit${choice.term ? ` "${choice.term}"` : ""}. Do not reuse any of ` +
              `them. Build a new set instead: search the vocabulary, then confirm the concepts with ` +
              `ui_confirm_concepts before creating it.`,
        },
      });
    },
    [pendingConceptSetChoice]
  );

  const toggleConcept = useCallback(
    (toolCallId: string, conceptId: number) => {
      const selection = messages.find(
        (message) => message.conceptSelection?.toolCallId === toolCallId
      )?.conceptSelection;
      if (!selection) return;
      // selectedIds already accounts for "no edit yet" (everything ticked), so this
      // works the same on the first click as on the tenth.
      const next = selection.selectedIds.includes(conceptId)
        ? selection.selectedIds.filter((id) => id !== conceptId)
        : [...selection.selectedIds, conceptId];
      setConceptEdits((previous) => ({ ...previous, [toolCallId]: next }));
    },
    [messages]
  );

  const submitConceptSelection = useCallback(
    (approved: boolean) => {
      const selection = pendingConceptSelection;
      if (!selection) return;
      const kept = selection.concepts.filter((concept) => selection.selectedIds.includes(concept.conceptId));
      // Approving an empty list is a rejection with extra steps; collapse the two so
      // the model gets one unambiguous signal either way.
      const accepted = approved && kept.length > 0;
      addToolOutputRef.current?.({
        tool: CONFIRM_CONCEPTS_TOOL,
        toolCallId: selection.toolCallId,
        output: {
          approved: accepted,
          conceptIds: accepted ? kept.map((concept) => concept.conceptId) : [],
          concepts: accepted ? kept : [],
          removedConceptIds: selection.concepts
            .filter((concept) => !selection.selectedIds.includes(concept.conceptId))
            .map((concept) => concept.conceptId),
          note: accepted
            ? "The user approved these concepts. Create the concept set with EXACTLY these conceptIds and no others."
            : "The user rejected the proposed concepts. Do not create the concept set — ask what to search for instead.",
        },
      });
    },
    [pendingConceptSelection]
  );

  return {
    messages,
    sendMessage,
    reset,
    isStreaming: chat.status === "submitted" || chat.status === "streaming",
    liveEditing: available && !datasetMismatch,
    datasetMismatch,
    datasetMissing: !activeDataset?.id,
    pendingConceptSelection,
    toggleConcept,
    submitConceptSelection,
    pendingConceptSetChoice,
    toggleConceptSetOption,
    submitConceptSetChoice,
    error: chat.error,
  };
}
