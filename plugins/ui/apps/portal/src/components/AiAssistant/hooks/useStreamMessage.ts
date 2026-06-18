import { useState, useCallback, useRef, useEffect, Dispatch, SetStateAction } from "react";
import { streamMessage } from "../api/client";
import type { ChatMessage, ToolStatus, ArtifactEvent } from "../types";
import type { ChatTurn } from "../api/client";

type SetMessages = Dispatch<SetStateAction<ChatMessage[]>>;

interface UseStreamMessageResult {
  send: (userInput: string) => Promise<void>;
  isStreaming: boolean;
}

/** Maximum number of prior turns to include in each request. */
const MAX_HISTORY_TURNS = 20;

/**
 * Provides a `send` function that:
 *   1. Appends a user bubble immediately.
 *   2. Appends an empty assistant bubble and streams tokens into it.
 *   3. Updates tool-call badges and artifact cards in real time (if any).
 *   4. Sends prior completed turns as `history` so the backend agent has
 *      full conversational context.
 */
export function useStreamMessage(
  datasetId: string | null,
  messages: ChatMessage[],
  setMessages: SetMessages
): UseStreamMessageResult {
  const [isStreaming, setIsStreaming] = useState(false);
  const streamingRef = useRef(false); // guard against concurrent sends

  const datasetIdRef = useRef(datasetId);
  useEffect(() => {
    datasetIdRef.current = datasetId;
  }, [datasetId]);

  // Keep a ref to the latest messages so `send` (memoised) can read them
  // without being re-created on every render.
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const send = useCallback(
    async (userInput: string) => {
      const did = datasetIdRef.current;
      if (!did || streamingRef.current) return;

      streamingRef.current = true;
      setIsStreaming(true);

      // Snapshot prior completed turns BEFORE appending the new user message.
      // Only include turns that have settled (done=true) and have non-empty
      // content so we never send a half-streamed or empty bubble.
      const history: ChatTurn[] = messagesRef.current
        .filter((m) => m.done && m.content.trim())
        .slice(-MAX_HISTORY_TURNS)
        .map((m) => ({ role: m.role, content: m.content }));

      const userMsgId = crypto.randomUUID();
      const assistantMsgId = crypto.randomUUID();

      setMessages((prev) => [
        ...prev,
        {
          id: userMsgId,
          role: "user",
          content: userInput,
          toolStatuses: [],
          artifacts: [],
          done: true,
        },
        {
          id: assistantMsgId,
          role: "assistant",
          content: "",
          toolStatuses: [],
          artifacts: [],
          done: false,
        },
      ]);

      const finish = () => {
        streamingRef.current = false;
        setIsStreaming(false);
        setMessages((prev) => prev.map((m) => (m.id === assistantMsgId ? { ...m, done: true } : m)));
      };

      try {
        await streamMessage(
          did,
          userInput,
          {
            onToken: (delta) => {
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantMsgId ? { ...m, content: m.content + delta } : m))
              );
            },

            onToolStart: (id, name) => {
              const status: ToolStatus = { id, name, state: "pending" };
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantMsgId ? { ...m, toolStatuses: [...m.toolStatuses, status] } : m))
              );
            },

            onToolEnd: (id, _name, ok, summary) => {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        toolStatuses: m.toolStatuses.map((t) =>
                          t.id === id ? { ...t, state: ok ? "ok" : "error", summary } : t
                        ),
                      }
                    : m
                )
              );
            },

            onArtifact: (kind, payload) => {
              const artifact: ArtifactEvent = { kind, payload };
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantMsgId ? { ...m, artifacts: [...m.artifacts, artifact] } : m))
              );
              // Broadcast across SPA boundary — PatientAnalytics.vue listens for this
              window.dispatchEvent(
                new CustomEvent("d2e-ai-artifact", {
                  detail: { kind, payload },
                })
              );
            },

            onDone: finish,

            onError: (message) => {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId ? { ...m, content: m.content || `⚠ ${message}`, done: true } : m
                )
              );
              streamingRef.current = false;
              setIsStreaming(false);
            },
          },
          history
        );
      } catch (err) {
        // Surface error in the assistant bubble.
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  content: m.content || `⚠ ${err instanceof Error ? err.message : String(err)}`,
                  done: true,
                }
              : m
          )
        );
        streamingRef.current = false;
        setIsStreaming(false);
      }
    },
    [setMessages]
  );

  return { send, isStreaming };
}
