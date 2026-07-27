import { useCallback, useEffect, useMemo, useRef } from "react";
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
import { useActiveDataset } from "../../../contexts";
import { callPaTool } from "../webmcp/paToolBridge";
import { usePaTools } from "../webmcp/usePaTools";
import { ChatMessage, ToolActivity } from "../types";

// Relative on purpose: the portal is served under <base href="/d2e/portal">, so a
// base-relative path resolves to /d2e/code-suggestion/agent — the same convention
// every other portal API call uses (see axios/request.ts baseURLs).
const AGENT_API = "code-suggestion/agent";

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

// The drawer renders its own bubble model; flatten UIMessage parts into it.
// Text parts are concatenated (the model may emit several around tool calls) and
// tool parts become badges.
function toChatMessage(message: UIMessage): ChatMessage {
  const text = message.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join("");
  const tools = message.parts.filter(isToolUIPart).map(toToolActivity);
  return { id: message.id, role: message.role === "user" ? "user" : "assistant", text, tools };
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
 */
export function useCohortChat(): CohortChatState {
  const { activeDataset } = useActiveDataset();
  const { available, datasetMismatch, tools } = usePaTools();

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
  }, [chat]);

  const messages = useMemo(() => chat.messages.map(toChatMessage), [chat.messages]);

  return {
    messages,
    sendMessage,
    reset,
    isStreaming: chat.status === "submitted" || chat.status === "streaming",
    liveEditing: available && !datasetMismatch,
    datasetMismatch,
    datasetMissing: !activeDataset?.id,
    error: chat.error,
  };
}
