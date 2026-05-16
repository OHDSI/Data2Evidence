import { useState, useCallback, useRef, Dispatch, SetStateAction } from "react";
import { streamMessage } from "../api/client";
import type { ChatMessage, ToolStatus, ArtifactEvent } from "../types";

type SetMessages = Dispatch<SetStateAction<ChatMessage[]>>;

interface UseStreamMessageResult {
  send: (userInput: string) => Promise<void>;
  isStreaming: boolean;
}

/**
 * Provides a `send` function that:
 *   1. Appends a user bubble immediately.
 *   2. Appends an empty assistant bubble and streams tokens into it.
 *   3. Updates tool-call badges and artifact cards in real time.
 *   4. Fires a window `d2e-ai-artifact` CustomEvent for each artifact so
 *      cross-SPA listeners (e.g. PatientAnalytics.vue) can react.
 */
export function useStreamMessage(
  sessionId: string | null,
  setMessages: SetMessages
): UseStreamMessageResult {
  const [isStreaming, setIsStreaming] = useState(false);
  const streamingRef = useRef(false); // guard against concurrent sends

  const send = useCallback(
    async (userInput: string) => {
      if (!sessionId || streamingRef.current) return;

      streamingRef.current = true;
      setIsStreaming(true);

      const userMsgId = crypto.randomUUID();
      const assistantMsgId = crypto.randomUUID();

      setMessages((prev) => [
        ...prev,
        { id: userMsgId, role: "user", content: userInput, toolStatuses: [], artifacts: [], done: true },
        { id: assistantMsgId, role: "assistant", content: "", toolStatuses: [], artifacts: [], done: false },
      ]);

      const finish = () => {
        streamingRef.current = false;
        setIsStreaming(false);
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMsgId ? { ...m, done: true } : m))
        );
      };

      await streamMessage(sessionId, userInput, {
        onToken: (delta) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId ? { ...m, content: m.content + delta } : m
            )
          );
        },

        onToolStart: (id, name) => {
          const status: ToolStatus = { id, name, state: "pending" };
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? { ...m, toolStatuses: [...m.toolStatuses, status] }
                : m
            )
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
            prev.map((m) =>
              m.id === assistantMsgId
                ? { ...m, artifacts: [...m.artifacts, artifact] }
                : m
            )
          );
          // Broadcast across SPA boundary — PatientAnalytics.vue listens for this
          window.dispatchEvent(
            new CustomEvent("d2e-ai-artifact", { detail: { kind, payload } })
          );
        },

        onDone: finish,

        onError: (message) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? { ...m, content: m.content || `⚠ ${message}`, done: true }
                : m
            )
          );
          streamingRef.current = false;
          setIsStreaming(false);
        },
      });
    },
    [sessionId, setMessages]
  );

  return { send, isStreaming };
}
