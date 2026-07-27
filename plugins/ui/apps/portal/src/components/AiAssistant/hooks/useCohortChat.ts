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
import { ChatMessage, ConceptSelection, ConceptSuggestion, ToolActivity } from "../types";

// Relative on purpose: the portal is served under <base href="/d2e/portal">, so a
// base-relative path resolves to /d2e/code-suggestion/agent — the same convention
// every other portal API call uses (see axios/request.ts baseURLs).
const AGENT_API = "code-suggestion/agent";

// The browser-side tool the agent calls to have a concept list confirmed before it
// creates the concept set. Declared server-side with no executor (see
// code-suggestion/src/agent/cohortAgent.ts), so the SDK streams the call here and
// the turn stays parked until the user answers — that pause IS the review step.
export const CONFIRM_CONCEPTS_TOOL = "ui_confirm_concepts";

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

// The drawer renders its own bubble model; flatten UIMessage parts into it.
// Text parts are concatenated (the model may emit several around tool calls) and
// tool parts become badges.
function toChatMessage(message: UIMessage, edits: Record<string, number[]>, fallbackName: string): ChatMessage {
  const text = message.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join("");
  const toolParts = message.parts.filter(isToolUIPart);
  // The confirmation call is rendered as the interactive card, so keep it out of the
  // tool rows too — a "Ran ui_confirm_concepts" line above its own card is noise.
  const confirmPart = toolParts.find((part) => getToolOrDynamicToolName(part) === CONFIRM_CONCEPTS_TOOL);
  const tools = toolParts
    .filter((part) => getToolOrDynamicToolName(part) !== CONFIRM_CONCEPTS_TOOL)
    .map(toToolActivity);
  return {
    id: message.id,
    role: message.role === "user" ? "user" : "assistant",
    text,
    tools,
    conceptSelection: confirmPart ? toConceptSelection(confirmPart, edits, fallbackName) : undefined,
  };
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
  }, [chat]);

  const fallbackName = getText(i18nKeys.AI_ASSISTANT__CONCEPTS_SET_FALLBACK_NAME);

  const messages = useMemo(
    () => chat.messages.map((message) => toChatMessage(message, conceptEdits, fallbackName)),
    [chat.messages, conceptEdits, fallbackName]
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
    error: chat.error,
  };
}
